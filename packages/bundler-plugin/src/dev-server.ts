import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { Server } from 'bun';
import type {
  DevServerOptions,
  Platform,
  SymbolicateRequest,
} from './types.js';
import { createResolverPlugin } from './resolver.js';
import { createAssetPlugin } from './assets.js';
import { createBabelHybridPlugin } from './babel-hybrid.js';
import { Symbolicator } from './symbolicator.js';
import { HMRServer, type ClientData } from './hmr.js';

export interface DevServerInstance {
  server: Server<ClientData>;
  port: number;
  host: string;
  url: string;
  stop: () => void;
}

interface CachedBundle {
  code: string;
  map?: string;
  timestamp: number;
}

/**
 * Starts the React Native Dev Server powered by Bun.serve()
 */
export async function startDevServer(
  options: DevServerOptions
): Promise<DevServerInstance> {
  const projectRoot = path.resolve(options.projectRoot);
  const host = options.host ?? 'localhost';
  const port = options.port ?? 8081;

  const symbolicator = new Symbolicator(projectRoot);
  const bundleCache = new Map<string, CachedBundle>();

  if (options.resetCache) {
    const tempDir = path.join(projectRoot, '.bun-rn-temp');
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
    },
  });

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

    // Temporary virtual entry file
    const tempEntryDir = path.join(projectRoot, '.bun-rn-temp');
    if (!fs.existsSync(tempEntryDir)) {
      fs.mkdirSync(tempEntryDir, { recursive: true });
    }
    const virtualEntryPath = path.join(
      tempEntryDir,
      `dev-entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.js`
    );

    const virtualEntryContent = `// Auto-generated dev entry by react-native-bun-build
var __DEV__ = ${dev ? 'true' : 'false'};
var global = typeof global !== 'undefined' ? global : globalThis;
global.__DEV__ = __DEV__;

try {
  require('react-native/Libraries/Core/InitializeCore');
} catch (e) {
  try {
    require('react-native/setup-env');
  } catch (e2) {}
}

require(${JSON.stringify(candidateEntry)});
`;

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
        minify,
        sourcemap: 'external',
        define: {
          __DEV__: JSON.stringify(dev),
          'process.env.NODE_ENV': JSON.stringify(
            dev ? 'development' : 'production'
          ),
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

    const jsOutput = buildResult.outputs.find(
      (out) => out.kind === 'entry-point'
    );
    const sourcemapArtifact = buildResult.outputs.find(
      (out) => out.kind === 'sourcemap'
    );

    if (!jsOutput) {
      throw new Error('No entry-point output produced by Bun.build');
    }

    const prelude = `var __DEV__ = ${dev ? 'true' : 'false'};\nvar global = typeof global !== 'undefined' ? global : globalThis;\nglobal.__DEV__ = __DEV__;\n`;
    const mapText = sourcemapArtifact ? await sourcemapArtifact.text() : undefined;
    const bundleText =
      prelude +
      (await jsOutput.text()) +
      (mapText ? `\n//# sourceMappingURL=/${entryName}.map\n` : '');

    const buildTimeMs = Math.round(performance.now() - startTime);
    return {
      code: bundleText,
      map: mapText,
      buildTimeMs,
    };
  }

  // Launch Bun.serve
  const server = Bun.serve<ClientData>({
    port,
    hostname: host,
    async fetch(req, srv) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // 1. WebSocket upgrade for /hot
      if (pathname === '/hot') {
        const upgraded = srv.upgrade(req, {
          data: {
            id: Math.random().toString(36).slice(2, 9),
            clientUrl: req.url,
            entryPoints: [],
            optedIntoHMR: false,
          },
        });
        if (upgraded) return undefined;
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

      // 3. Symbolicate endpoint
      if (pathname === '/symbolicate' && req.method === 'POST') {
        try {
          const body = (await req.json()) as SymbolicateRequest;
          if (!body || !Array.isArray(body.stack)) {
            return new Response(
              JSON.stringify({ error: 'Invalid stack trace format' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
          const result = symbolicator.symbolicate(body);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err.message || 'Symbolication failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
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
            const editor = process.env.REACT_EDITOR || process.env.EDITOR;
            const line = body.lineNumber ?? 1;
            if (editor) {
              spawn(editor, [`${body.file}:${line}`], {
                detached: true,
                stdio: 'ignore',
              });
            } else {
              spawn('code', ['--goto', `${body.file}:${line}`], {
                detached: true,
                stdio: 'ignore',
              }).on('error', () => {
                spawn('open', [body.file!], { detached: true, stdio: 'ignore' });
              });
            }
          }
          return new Response('OK', { status: 200 });
        } catch {
          return new Response('Failed to open file', { status: 500 });
        }
      }

      // 5. Source map request
      if (pathname.endsWith('.map')) {
        const bundlePathname = pathname.replace(/\.map$/, '.bundle');
        const cached = bundleCache.get(bundlePathname);
        if (cached && cached.map) {
          return new Response(cached.map, {
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
              'X-Metro-Files-Changed-Count': '0',
            },
          });
        }


        try {
          const { code, map, buildTimeMs } = await buildBundle(
            entryName,
            platform,
            dev,
            minify
          );

          bundleCache.set(cacheKey, { code, map, timestamp: Date.now() });
          bundleCache.set(pathname, { code, map, timestamp: Date.now() });

          if (map) {
            symbolicator.registerSourceMap(req.url, map);
            symbolicator.registerSourceMap(pathname, map);
          }

          console.log(
            `[DevServer] Bundled ${pathname} (${platform}, dev=${dev}) in ${buildTimeMs}ms`
          );

          return new Response(code, {
            headers: {
              'Content-Type': 'application/javascript; charset=UTF-8',
              'X-Metro-Files-Changed-Count': '0',
            },
          });
        } catch (err: any) {
          console.error(`[DevServer] Bundle error for ${pathname}:`, err.message);
          return new Response(
            JSON.stringify({
              type: 'TransformError',
              message: err.message,
              errors: [{ description: err.message }],
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

      return new Response('Not Found', { status: 404 });
    },
    websocket: {
      open(ws) {
        hmrServer.handleOpen(ws);
      },
      message(ws, message) {
        hmrServer.handleMessage(ws, message);
      },
      close(ws) {
        hmrServer.handleClose(ws);
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
  };
}

