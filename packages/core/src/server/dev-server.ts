import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import type { Server } from 'bun';
import type { DevServerOptions, Platform, SymbolicateRequest } from '../types.js';
import { createResolverPlugin, clearResolverCache } from '../resolver/index.js';
import { createAssetPlugin } from '../assets/index.js';
import { createBabelHybridPlugin } from '../babel/index.js';
import { Symbolicator } from '../diagnostics/index.js';
import { generateRuntimePrelude, generateVirtualEntryContent } from '../bundler/banner.js';
import { HMRServer, type ClientData } from './hmr-socket.js';
import { InspectorProxy } from './inspector-proxy.js';

export interface DevServerInstance {
  server: Server<ClientData>;
  port: number;
  host: string;
  url: string;
  stop: () => void;
  broadcastReload: (reason?: string) => void;
  broadcastDevMenu: () => void;
}

interface CachedBundle {
  code: string;
  timestamp: number;
}

/**
 * Starts the React Native Dev Server powered by Bun.serve()
 */
export async function startDevServer(options: DevServerOptions): Promise<DevServerInstance> {
  const projectRoot = path.resolve(options.projectRoot);
  const host = options.host ?? 'localhost';
  const port = options.port ?? 8081;

  const symbolicator = new Symbolicator(projectRoot);
  const bundleCache = new Map<string, CachedBundle>();
  const sourcemapCache = new Map<string, string>();

  if (options.resetCache) {
    const tempDir = path.join(projectRoot, '.jjinppang-temp');
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  const hmrServer = new HMRServer({
    projectRoot,
    host,
    port,
    onFileChange: (_filePath) => {
      // Invalidate in-memory bundle cache on file changes
      bundleCache.clear();
      sourcemapCache.clear();
      clearResolverCache();
    },
  });

  const inspectorProxy = new InspectorProxy();

  async function buildBundle(
    entryName: string,
    platform: Platform,
    dev: boolean,
    minify: boolean
  ): Promise<{ code: string; map?: string; buildTimeMs: number }> {
    const startTime = performance.now();

    // Resolve entry file
    let candidateEntry = path.resolve(projectRoot, entryName);
    if (!fs.existsSync(candidateEntry)) {
      const exts = ['.js', '.jsx', '.ts', '.tsx'];
      for (const ext of exts) {
        if (fs.existsSync(candidateEntry + ext)) {
          candidateEntry += ext;
          break;
        }
      }
    }

    if (!fs.existsSync(candidateEntry)) {
      // Check index.js/index.ts fallback
      candidateEntry = path.resolve(projectRoot, 'index.js');
    }

    // Temporary virtual entry file — reuse shared generateVirtualEntryContent
    const tempEntryDir = path.join(projectRoot, '.jjinppang-temp');
    if (!fs.existsSync(tempEntryDir)) {
      fs.mkdirSync(tempEntryDir, { recursive: true });
    }
    const virtualEntryPath = path.join(
      tempEntryDir,
      `dev-entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.js`
    );

    const virtualEntryContent = generateVirtualEntryContent(candidateEntry, dev);
    fs.writeFileSync(virtualEntryPath, virtualEntryContent, 'utf8');

    const assetPlugin = createAssetPlugin(
      {
        projectRoot,
        platform,
        assetExtensions: options.assetExtensions,
      },
      []
    );

    const babelPlugin = createBabelHybridPlugin({
      projectRoot,
      ...options.babel,
    });

    const resolverPlugin = createResolverPlugin({
      platform,
      projectRoot,
      alias: options.alias,
    });

    let buildResult;
    try {
      buildResult = await Bun.build({
        entrypoints: [virtualEntryPath],
        target: 'browser',
        format: 'iife',
        banner: generateRuntimePrelude(dev),
        minify,
        sourcemap: 'external',
        define: {
          __DEV__: JSON.stringify(dev),
          'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
        },
        plugins: [resolverPlugin, assetPlugin, babelPlugin],
      });
    } finally {
      try {
        if (fs.existsSync(virtualEntryPath)) {
          fs.unlinkSync(virtualEntryPath);
        }
      } catch {}
    }

    if (!buildResult.success) {
      const errors = buildResult.logs
        .map((log) => `${log.level.toUpperCase()}: ${log.message}`)
        .join('\n');
      throw new Error(`Bun build error:\n${errors}`);
    }

    const jsOutput = buildResult.outputs.find((out) => out.kind === 'entry-point');
    const sourcemapArtifact = buildResult.outputs.find((out) => out.kind === 'sourcemap');

    if (!jsOutput) {
      throw new Error('No entry-point output produced by Bun.build');
    }

    // Virtual entry already sets __DEV__, global, and InitializeCore — no additional prelude needed
    const mapText = sourcemapArtifact ? await sourcemapArtifact.text() : undefined;
    const bundleText =
      (await jsOutput.text()) + (mapText ? `\n//# sourceMappingURL=/${entryName}.map\n` : '');

    const buildTimeMs = Math.round(performance.now() - startTime);
    return {
      code: bundleText,
      map: mapText,
      buildTimeMs,
    };
  }

  /**
   * Opens a file in the user's preferred editor with cross-platform fallback
   */
  function openFileInEditor(file: string, line: number): void {
    const editor = process.env.REACT_EDITOR || process.env.EDITOR;
    if (editor) {
      spawn(editor, [`${file}:${line}`], {
        detached: true,
        stdio: 'ignore',
      });
      return;
    }

    // Try VS Code first, then platform-specific fallback
    spawn('code', ['--goto', `${file}:${line}`], {
      detached: true,
      stdio: 'ignore',
    }).on('error', () => {
      const platform = os.platform();
      if (platform === 'darwin') {
        spawn('open', [file], { detached: true, stdio: 'ignore' });
      } else if (platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', file], { detached: true, stdio: 'ignore' });
      } else {
        // Linux and other Unix-like systems
        spawn('xdg-open', [file], { detached: true, stdio: 'ignore' });
      }
    });
  }

  // Launch Bun.serve
  const server = Bun.serve<ClientData>({
    port,
    hostname: host,
    async fetch(req, srv) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      // Skip logging for noisy polling endpoints
      if (pathname !== '/message' && !pathname.startsWith('/inspector/device')) {
        console.log(`[DevServer] REQ: ${req.method} ${pathname}${url.search}`);
      }

      // 1. WebSocket upgrade for /hot, /inspector/debug, /inspector/device, and /message (PackagerConnection)
      if (
        pathname === '/hot' ||
        pathname === '/inspector/debug' ||
        pathname === '/inspector/device' ||
        pathname === '/message'
      ) {
        // If HTTP request to /inspector/device (polling device list)
        if (pathname === '/inspector/device' && req.headers.get('upgrade') !== 'websocket') {
          return new Response(JSON.stringify(inspectorProxy.getDeviceList()), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const upgraded = srv.upgrade(req, {
          data: {
            id: Math.random().toString(36).slice(2, 9),
            clientUrl: req.url,
            entryPoints: [],
            optedIntoHMR: false,
          },
        });
        if (upgraded) return undefined;
        // If HTTP request to /message (e.g. non-WebSocket check)
        if (pathname === '/message') {
          return new Response(null, { status: 204 });
        }
        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      // 2. Health check endpoint (Metro status)
      if (pathname === '/status' || pathname === '/') {
        return new Response('packager-status:running', {
          headers: {
            'Content-Type': 'text/plain',
            'X-React-Native-Project-Root': projectRoot,
          },
        });
      }

      // 2.1 Chrome DevTools / Hermes Protocol Version
      if (pathname === '/json/version') {
        return new Response(
          JSON.stringify({
            Browser: 'React Native (Bun DevServer)',
            'Protocol-Version': '1.1',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 2.2 Chrome DevTools / Hermes Target List
      if (pathname === '/json' || pathname === '/json/list') {
        const actualPort = srv.port ?? port;
        const devices = inspectorProxy.getDeviceList();
        const debugTargets =
          devices.length > 0
            ? devices.map((d) => ({
                id: d.id,
                title: d.name,
                description: d.app,
                type: 'page',
                devtoolsFrontendUrl: `devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=${host}:${actualPort}/inspector/debug`,
                webSocketDebuggerUrl: `ws://${host}:${actualPort}/inspector/debug`,
                faviconUrl: 'https://reactnative.dev/img/header_logo.svg',
              }))
            : [
                {
                  id: 'react-native-bun-app',
                  title: 'React Native Application',
                  description: 'Bun React Native Debug Target',
                  type: 'page',
                  devtoolsFrontendUrl: `devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=${host}:${actualPort}/inspector/debug`,
                  webSocketDebuggerUrl: `ws://${host}:${actualPort}/inspector/debug`,
                  faviconUrl: 'https://reactnative.dev/img/header_logo.svg',
                },
              ];
        return new Response(JSON.stringify(debugTargets), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 3. Symbolicate endpoint
      if (pathname === '/symbolicate' && req.method === 'POST') {
        try {
          const body = (await req.json()) as SymbolicateRequest;
          if (!body || !Array.isArray(body.stack)) {
            return new Response(JSON.stringify({ error: 'Invalid stack trace format' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          const result = symbolicator.symbolicate(body);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Symbolication failed';
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // 4. Open stack frame in editor
      if (pathname === '/open-stack-frame' && req.method === 'POST') {
        try {
          const body = (await req.json()) as {
            file?: string;
            lineNumber?: number;
          };
          if (body && body.file) {
            openFileInEditor(body.file, body.lineNumber ?? 1);
          }
          return new Response('OK', { status: 200 });
        } catch {
          return new Response('Failed to open file', { status: 500 });
        }
      }

      // 5. Source map request — use dedicated sourcemap cache with query params
      if (pathname.endsWith('.map')) {
        const mapCacheKey = `${pathname}?${url.searchParams.toString()}`;
        const cachedMap = sourcemapCache.get(mapCacheKey) || sourcemapCache.get(pathname);
        if (cachedMap) {
          return new Response(cachedMap, {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Source map not found', { status: 404 });
      }

      // 6. Bundle request (e.g. /index.bundle)
      if (pathname.endsWith('.bundle')) {
        const platform = (url.searchParams.get('platform') as Platform) || 'ios';
        const dev = url.searchParams.get('dev') !== 'false';
        const minify = url.searchParams.get('minify') === 'true';
        const entryName = pathname.replace(/^\//, '').replace(/\.bundle$/, '');

        const cacheKey = `${pathname}?platform=${platform}&dev=${dev}&minify=${minify}`;
        const cached = bundleCache.get(cacheKey);

        if (cached) {
          return new Response(cached.code, {
            headers: {
              'Content-Type': 'application/javascript; charset=UTF-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
              'X-Metro-Files-Changed-Count': '0',
            },
          });
        }

        try {
          const { code, map, buildTimeMs } = await buildBundle(entryName, platform, dev, minify);

          bundleCache.set(cacheKey, { code, timestamp: Date.now() });

          if (map) {
            // Store sourcemap with query-qualified key and plain pathname key
            const mapPathname = pathname.replace(/\.bundle$/, '.map');
            const mapCacheKey = `${mapPathname}?platform=${platform}&dev=${dev}&minify=${minify}`;
            sourcemapCache.set(mapCacheKey, map);
            sourcemapCache.set(mapPathname, map);

            symbolicator.registerSourceMap(req.url, map);
            symbolicator.registerSourceMap(pathname, map);
          }

          console.log(
            `[DevServer] Bundled ${pathname} (${platform}, dev=${dev}) in ${buildTimeMs}ms`
          );

          return new Response(code, {
            headers: {
              'Content-Type': 'application/javascript; charset=UTF-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
              'X-Metro-Files-Changed-Count': '0',
            },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown build error';
          console.error(`[DevServer] Bundle error for ${pathname}:`, message);
          return new Response(
            JSON.stringify({
              type: 'TransformError',
              message,
              errors: [{ description: message }],
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // 7. Static assets request (/assets/...)
      if (pathname.startsWith('/assets/')) {
        const relAssetPath = pathname.replace(/^\/assets\//, '');
        const fullAssetPath = path.resolve(projectRoot, relAssetPath);
        if (fs.existsSync(fullAssetPath)) {
          return new Response(Bun.file(fullAssetPath));
        }
      }

      // Note: /inspector/device is already handled in the WebSocket upgrade block above (L223-227)

      return new Response('Not Found', { status: 404 });
    },
    websocket: {
      open(ws) {
        const clientUrl = ws.data.clientUrl || '';
        if (clientUrl.includes('/inspector/device')) {
          try {
            inspectorProxy.handleDeviceOpen(ws, new URL(clientUrl, 'http://localhost'));
          } catch {
            // ignore
          }
        } else if (clientUrl.includes('/inspector/debug')) {
          inspectorProxy.handleDebuggerOpen(ws);
        } else {
          hmrServer.handleOpen(ws);
        }
      },
      message(ws, message) {
        const clientUrl = ws.data.clientUrl || '';
        if (clientUrl.includes('/inspector/device')) {
          inspectorProxy.handleDeviceMessage(ws, message);
        } else if (clientUrl.includes('/inspector/debug')) {
          inspectorProxy.handleDebuggerMessage(ws, message);
        } else {
          hmrServer.handleMessage(ws, message);
        }
      },
      close(ws) {
        const clientUrl = ws.data.clientUrl || '';
        if (clientUrl.includes('/inspector/device')) {
          inspectorProxy.handleDeviceClose(ws);
        } else if (clientUrl.includes('/inspector/debug')) {
          inspectorProxy.handleDebuggerClose(ws);
        } else {
          hmrServer.handleClose(ws);
        }
      },
    },
  });

  const actualPort = server.port ?? port;
  const url = `http://${host}:${actualPort}`;

  console.log(`
  ┌────────────────────────────────────────────────────────┐
  │  🚀 React Native Bun Dev Server                        │
  │                                                        │
  │  Dev server listening on ${url.padEnd(29)} │
  │  HMR WebSocket listening on ws://${host}:${String(actualPort).padEnd(5)}/hot   │
  │  Symbolicate endpoint ready at /symbolicate            │
  └────────────────────────────────────────────────────────┘
  `);

  return {
    server,
    port: actualPort,
    host,
    url,
    stop() {
      hmrServer.close();
      server.stop();
    },
    broadcastReload(reason?: string) {
      bundleCache.clear();
      sourcemapCache.clear();
      clearResolverCache();
      hmrServer.broadcastReload(reason);
    },
    broadcastDevMenu() {
      hmrServer.broadcastDevMenu();
    },
  };
}
