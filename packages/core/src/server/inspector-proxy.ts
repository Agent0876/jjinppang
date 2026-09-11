import type { ServerWebSocket } from 'bun';
import type { ClientData } from './hmr-socket.js';

export interface InspectorDevice {
  id: string;
  name: string;
  app: string;
  ws?: ServerWebSocket<ClientData>;
}

/**
 * Manages Hermes CDP (Chrome DevTools Protocol) debugging connections.
 * Bridges messages between the native React Native Hermes inspector (/inspector/device)
 * and Chrome DevTools / Flipper frontends (/inspector/debug).
 */
export class InspectorProxy {
  private devices: Map<string, InspectorDevice> = new Map();
  private debuggers: Set<ServerWebSocket<ClientData>> = new Set();

  /**
   * Registers or updates a device connection from /inspector/device
   */
  handleDeviceOpen(ws: ServerWebSocket<ClientData>, url: URL): void {
    const name = url.searchParams.get('name') || 'React Native Device';
    const app = url.searchParams.get('app') || 'React Native App';
    const id = ws.data.id || Math.random().toString(36).slice(2, 9);

    const device: InspectorDevice = {
      id,
      name,
      app,
      ws,
    };
    this.devices.set(id, device);
    console.log(`[InspectorProxy] Registered Hermes device target: ${name} (${id})`);
  }

  /**
   * Handles messages sent from native Hermes runtime to be forwarded to Chrome DevTools
   */
  handleDeviceMessage(ws: ServerWebSocket<ClientData>, message: string | Buffer): void {
    const payload = typeof message === 'string' ? message : message.toString();
    for (const dbg of this.debuggers) {
      try {
        dbg.send(payload);
      } catch {
        this.debuggers.delete(dbg);
      }
    }
  }

  /**
   * Handles device disconnect
   */
  handleDeviceClose(ws: ServerWebSocket<ClientData>): void {
    for (const [id, dev] of this.devices.entries()) {
      if (dev.ws === ws) {
        this.devices.delete(id);
        console.log(`[InspectorProxy] Unregistered Hermes device target: ${dev.name} (${id})`);
        break;
      }
    }
  }

  /**
   * Registers a Chrome DevTools debugger connection from /inspector/debug
   */
  handleDebuggerOpen(ws: ServerWebSocket<ClientData>): void {
    this.debuggers.add(ws);
    console.log(`[InspectorProxy] Chrome DevTools frontend connected`);
  }

  /**
   * Handles messages sent from Chrome DevTools to be forwarded to Hermes runtime
   */
  handleDebuggerMessage(ws: ServerWebSocket<ClientData>, message: string | Buffer): void {
    const payload = typeof message === 'string' ? message : message.toString();

    // Broadcast CDP request to all active device targets
    if (this.devices.size > 0) {
      for (const dev of this.devices.values()) {
        try {
          dev.ws?.send(payload);
        } catch {
          if (dev.ws) this.handleDeviceClose(dev.ws);
        }
      }
    } else {
      // Mock CDP responses if no native Hermes device is actively connected
      try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed.id === 'number') {
          // Acknowledge common CDP discovery commands so DevTools UI loads gracefully
          const mockResponse = {
            id: parsed.id,
            result: {},
          };
          ws.send(JSON.stringify(mockResponse));
        }
      } catch {}
    }
  }

  /**
   * Handles Chrome DevTools disconnect
   */
  handleDebuggerClose(ws: ServerWebSocket<ClientData>): void {
    this.debuggers.delete(ws);
  }

  /**
   * Returns list of currently connected devices
   */
  getDeviceList(): Array<{ id: string; name: string; app: string }> {
    return Array.from(this.devices.values()).map(({ id, name, app }) => ({
      id,
      name,
      app,
    }));
  }
}
