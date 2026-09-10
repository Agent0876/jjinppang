import { describe, expect, it, afterAll, beforeAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  startDevServer,
  Symbolicator,
  generateCodeFrame,
  type DevServerInstance,
} from '../packages/bundler-plugin/src/index.js';

describe('Dev Server, Symbolicator & HMR Fast Refresh', () => {
  const testDir = path.join(__dirname, '.temp-dev-server-test');
  let devServer: DevServerInstance | null = null;
  const testPort = 18081;

  beforeAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create a mini project structure
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2)
    );

    // Mock minimal react-native
    const rnDir = path.join(testDir, 'node_modules/react-native');
    fs.mkdirSync(rnDir, { recursive: true });
    fs.writeFileSync(
      path.join(rnDir, 'package.json'),
      JSON.stringify({ name: 'react-native', main: 'index.js' })
    );
    fs.writeFileSync(
      path.join(rnDir, 'index.js'),
      'export const AppRegistry = { registerComponent: () => {} };'
    );
    const initDir = path.join(rnDir, 'Libraries/Core');
    fs.mkdirSync(initDir, { recursive: true });
    fs.writeFileSync(path.join(initDir, 'InitializeCore.js'), '// mock init');

    // Create App.tsx and index.js
    fs.writeFileSync(
      path.join(testDir, 'App.tsx'),
      `export function App() {
  const msg = "Hello from Bun RN!";
  return msg;
}
`
    );

    fs.writeFileSync(
      path.join(testDir, 'index.js'),
      `import { App } from './App';
console.log('App loaded:', App());
`
    );
  });

  afterAll(() => {
    if (devServer) {
      devServer.stop();
      devServer = null;
    }
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('generateCodeFrame', () => {
    it('generates a formatted code frame with line indicator and column pointer', () => {
      const appFile = path.join(testDir, 'App.tsx');
      const frame = generateCodeFrame(appFile, 2, 8);

      expect(frame).not.toBeNull();
      expect(frame?.fileName).toBe(appFile);
      expect(frame?.location?.row).toBe(2);
      expect(frame?.location?.column).toBe(8);
      expect(frame?.content).toContain('> 2 |');
      expect(frame?.content).toContain('^');
    });

    it('returns null for non-existent files or invalid lines', () => {
      expect(generateCodeFrame('/non/existent/file.ts', 1, 0)).toBeNull();
      const appFile = path.join(testDir, 'App.tsx');
      expect(generateCodeFrame(appFile, 999, 0)).toBeNull();
    });
  });

  describe('Symbolicator', () => {
    it('symbolicates stack frames using registered sourcemap', () => {
      const symbolicator = new Symbolicator(testDir);

      // Create a mock sourcemap
      const mockMap = {
        version: 3,
        file: 'index.bundle',
        sources: ['App.tsx'],
        names: ['App'],
        mappings: 'AAAA,SAASA,GAAGA,CAAA',
      };

      symbolicator.registerSourceMap('http://localhost:8081/index.bundle', mockMap);

      const res = symbolicator.symbolicate({
        stack: [
          {
            file: 'http://localhost:8081/index.bundle',
            lineNumber: 1,
            column: 0,
            methodName: 'App',
          },
        ],
      });

      expect(res.stack.length).toBe(1);
      expect(res.stack[0].file).toContain('App.tsx');
      expect(res.codeFrame).not.toBeNull();
    });
  });

  describe('Dev Server Endpoints', () => {
    it('starts dev server and serves health check status', async () => {
      devServer = await startDevServer({
        projectRoot: testDir,
        port: testPort,
        host: 'localhost',
      });

      const res = await fetch(`http://localhost:${testPort}/status`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('packager-status:running');

      const rootRes = await fetch(`http://localhost:${testPort}/`);
      expect(rootRes.status).toBe(200);
      expect(await rootRes.text()).toContain('packager-status:running');
    });

    it('serves dynamic bundle and external sourcemap', async () => {
      const bundleRes = await fetch(
        `http://localhost:${testPort}/index.bundle?platform=ios&dev=true`
      );
      expect(bundleRes.status).toBe(200);
      expect(bundleRes.headers.get('content-type')).toContain('javascript');

      const bundleCode = await bundleRes.text();
      expect(bundleCode).toContain('__DEV__');
      expect(bundleCode).toContain('Hello from Bun RN!');
      expect(bundleCode).toContain('//# sourceMappingURL=/index.map');

      // Request sourcemap
      const mapRes = await fetch(`http://localhost:${testPort}/index.map`);
      expect(mapRes.status).toBe(200);
      const mapJson = await mapRes.json();
      expect(mapJson.version).toBe(3);

      // Request macos dynamic bundle
      const macosRes = await fetch(
        `http://localhost:${testPort}/index.bundle?platform=macos&dev=true`
      );
      expect(macosRes.status).toBe(200);
      expect(macosRes.headers.get('content-type')).toContain('javascript');

      // Request windows dynamic bundle
      const windowsRes = await fetch(
        `http://localhost:${testPort}/index.bundle?platform=windows&dev=true`
      );
      expect(windowsRes.status).toBe(200);
      expect(windowsRes.headers.get('content-type')).toContain('javascript');
    });

    it('handles POST /symbolicate endpoint with valid response', async () => {
      const symRes = await fetch(`http://localhost:${testPort}/symbolicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stack: [
            {
              file: `http://localhost:${testPort}/index.bundle?platform=ios&dev=true`,
              lineNumber: 10,
              column: 5,
              methodName: 'testFunc',
            },
          ],
        }),
      });

      expect(symRes.status).toBe(200);
      const data = (await symRes.json()) as any;
      expect(Array.isArray(data.stack)).toBe(true);
      expect(data.stack.length).toBe(1);
    });

    it('handles POST /open-stack-frame endpoint', async () => {
      const openRes = await fetch(`http://localhost:${testPort}/open-stack-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: path.join(testDir, 'App.tsx'),
          lineNumber: 2,
        }),
      });

      expect(openRes.status).toBe(200);
      expect(await openRes.text()).toBe('OK');
    });

    it('connects to /hot WebSocket and handles HMR handshake and messages', async () => {
      const ws = new WebSocket(`ws://localhost:${testPort}/hot`);

      const messages: any[] = [];
      const openPromise = new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      ws.onmessage = (event) => {
        try {
          messages.push(JSON.parse(String(event.data)));
        } catch {}
      };

      await openPromise;

      // Register bundle entry point
      ws.send(
        JSON.stringify({
          type: 'register-entrypoints',
          entryPoints: [`http://localhost:${testPort}/index.bundle?platform=ios&dev=true`],
        })
      );

      // Send log opt-in
      ws.send(JSON.stringify({ type: 'log-opt-in' }));

      // Send heartbeat
      ws.send(JSON.stringify({ type: 'heartbeat' }));

      // Wait a bit for messages
      await new Promise((r) => setTimeout(r, 200));

      const hasRegistered = messages.some((m) => m.type === 'bundle-registered');
      const hasHeartbeat = messages.some((m) => m.type === 'heartbeat');

      expect(hasRegistered).toBe(true);
      expect(hasHeartbeat).toBe(true);

      ws.close();
    });
  });
});
