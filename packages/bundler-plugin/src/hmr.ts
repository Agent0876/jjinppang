import fs from 'node:fs';
import path from 'node:path';
import type { ServerWebSocket } from 'bun';
import type { HMRMessage, HMRUpdate } from './types.js';

export interface ClientData {
  id: string;
  clientUrl?: string;
  entryPoints: string[];
  optedIntoHMR: boolean;
}

export interface HMRServerOptions {
  projectRoot: string;
  host?: string;
  port?: number;
  onFileChange?: (filePath: string) => Promise<void> | void;
}

const HEARTBEAT_INTERVAL_MS = 20_000;
const WATCH_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.png', '.jpg', '.jpeg']);

const IGNORED_SEGMENTS = [
  'node_modules',
  '.git',
  '.bun-rn-temp',
  'dist',
  'build',
  'Pods',
  '.gradle',
];

/**
 * WebSocket HMR / Fast Refresh server conforming to Metro HMRClient protocol
 */
export class HMRServer {
  private clients: Set<ServerWebSocket<ClientData>> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private watcher: fs.FSWatcher | null = null;
  private projectRoot: string;
  private host: string;
  private port: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChangedFiles: Set<string> = new Set();
  private onFileChangeCallback?: (filePath: string) => Promise<void> | void;

  constructor(options: HMRServerOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.host = options.host ?? 'localhost';
    this.port = options.port ?? 8081;
    this.onFileChangeCallback = options.onFileChange;

    this.startHeartbeat();
    this.startWatcher();
  }

  /**
   * Called when a new WebSocket connection is opened
   */
  handleOpen(ws: ServerWebSocket<ClientData>): void {
    this.clients.add(ws);
    // Send immediate heartbeat to verify connection
    ws.send(JSON.stringify({ type: 'heartbeat' }));
  }

  /**
   * Called when a WebSocket client sends a message
   */
  handleMessage(ws: ServerWebSocket<ClientData>, message: string | Buffer): void {
    try {
      const data = JSON.parse(String(message));
      switch (data.type) {
        case 'register-entrypoints': {
          if (Array.isArray(data.entryPoints)) {
            ws.data.entryPoints = data.entryPoints;
          }
          ws.send(JSON.stringify({ type: 'bundle-registered' }));
          break;
        }
        case 'log-opt-in': {
          ws.data.optedIntoHMR = true;
          break;
        }
        case 'log': {
          const level = data.level || 'info';
          const args = Array.isArray(data.data) ? data.data : [data.data];
          if (level === 'error') {
            console.error('[RN Client Error]', ...args);
          } else if (level === 'warn') {
            console.warn('[RN Client Warn]', ...args);
          }
          break;
        }
        case 'heartbeat': {
          ws.send(JSON.stringify({ type: 'heartbeat' }));
          break;
        }
        default:
          break;
      }
    } catch {
      // Ignore invalid JSON messages
    }
  }

  /**
   * Called when a WebSocket client disconnects
   */
  handleClose(ws: ServerWebSocket<ClientData>): void {
    this.clients.delete(ws);
  }

  /**
   * Broadcasts an HMRMessage to all connected clients
   */
  broadcast(message: HMRMessage): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        client.send(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Triggers an HMR update sequence for changed files
   */
  async triggerUpdate(changedFiles: string[]): Promise<void> {
    if (this.clients.size === 0) return;

    // 1. Notify that update starts
    this.broadcast({
      type: 'update-start',
      body: { isInitialUpdate: false },
    });

    const revisionId = String(Date.now());
    const modifiedModules = changedFiles.map((file) => {
      const relPath = path.relative(this.projectRoot, file);
      const sourceURL = `http://${this.host}:${this.port}/${relPath}`;

      // Refresh hook that triggers ReactRefresh or full reload fallback
      const code = `
(function() {
  try {
    if (typeof global !== 'undefined' && global.__ReactRefresh) {
      global.__ReactRefresh.performReactRefresh();
    }
  } catch (err) {
    if (typeof global !== 'undefined' && global.__ReactRefresh) {
      global.__ReactRefresh.performFullRefresh('Fast Refresh fallback on ' + ${JSON.stringify(relPath)});
    }
  }
})();
`;
      return {
        module: [relPath, code] as [number | string, string],
        sourceURL,
      };
    });

    const updateBody: HMRUpdate = {
      isInitialUpdate: false,
      revisionId,
      added: [],
      modified: modifiedModules,
      deleted: [],
    };

    // 2. Send update body
    this.broadcast({
      type: 'update',
      body: updateBody,
    });

    // 3. Complete update
    this.broadcast({
      type: 'update-done',
      body: { changeId: revisionId },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast({ type: 'heartbeat' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private startWatcher(): void {
    try {
      this.watcher = fs.watch(this.projectRoot, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;

        // Check ignored paths
        for (const segment of IGNORED_SEGMENTS) {
          if (filename.includes(segment)) return;
        }

        const ext = path.extname(filename).toLowerCase();
        if (!WATCH_EXTENSIONS.has(ext)) return;

        const fullPath = path.resolve(this.projectRoot, filename);
        this.pendingChangedFiles.add(fullPath);

        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
          const files = Array.from(this.pendingChangedFiles);
          this.pendingChangedFiles.clear();
          if (files.length === 0) return;

          console.log(
            `[HMR] File change detected: ${files
              .map((f) => path.relative(this.projectRoot, f))
              .join(', ')}`
          );

          if (this.onFileChangeCallback) {
            try {
              for (const file of files) {
                await this.onFileChangeCallback(file);
              }
            } catch (err) {
              console.error('[HMR] Error during file change callback:', err);
            }
          }

          await this.triggerUpdate(files);
        }, 100);
      });
    } catch (err) {
      console.warn('[HMR] Failed to start recursive file watcher:', err);
    }
  }

  /**
   * Shuts down HMR server, file watcher, and timers
   */
  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const client of this.clients) {
      try {
        client.close(1000, 'Server closed');
      } catch {}
    }
    this.clients.clear();
  }
}
