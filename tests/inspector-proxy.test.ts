import { describe, expect, it } from 'bun:test';
import { InspectorProxy } from '../packages/core/src/server/inspector-proxy.js';

describe('Hermes CDP Inspector Proxy', () => {
  it('registers and lists connected Hermes devices', () => {
    const proxy = new InspectorProxy();
    expect(proxy.getDeviceList().length).toBe(0);

    const mockWs: any = {
      data: { id: 'device-1' },
      send: () => {},
    };
    const url = new URL('http://localhost:8081/inspector/device?name=iPhone16&app=com.test.app');

    proxy.handleDeviceOpen(mockWs, url);
    const list = proxy.getDeviceList();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('device-1');
    expect(list[0].name).toBe('iPhone16');
    expect(list[0].app).toBe('com.test.app');

    proxy.handleDeviceClose(mockWs);
    expect(proxy.getDeviceList().length).toBe(0);
  });

  it('forwards CDP messages bidirectionally between device and Chrome debugger', () => {
    const proxy = new InspectorProxy();

    const deviceSent: string[] = [];
    const debuggerSent: string[] = [];

    const deviceWs: any = {
      data: { id: 'dev-1' },
      send: (msg: string) => deviceSent.push(msg),
    };
    const debuggerWs: any = {
      data: { id: 'dbg-1' },
      send: (msg: string) => debuggerSent.push(msg),
    };

    // Open both connections
    proxy.handleDeviceOpen(deviceWs, new URL('http://localhost:8081/inspector/device?name=Pixel8'));
    proxy.handleDebuggerOpen(debuggerWs);

    // Debugger sends CDP command
    const cdpCommand = JSON.stringify({ id: 1, method: 'Debugger.enable' });
    proxy.handleDebuggerMessage(debuggerWs, cdpCommand);
    expect(deviceSent).toContain(cdpCommand);

    // Device responds with CDP result
    const cdpResponse = JSON.stringify({ id: 1, result: { debuggerId: '123' } });
    proxy.handleDeviceMessage(deviceWs, cdpResponse);
    expect(debuggerSent).toContain(cdpResponse);

    proxy.handleDebuggerClose(debuggerWs);
    proxy.handleDeviceClose(deviceWs);
  });

  it('provides mock CDP acknowledgment when debugger connects without active device', () => {
    const proxy = new InspectorProxy();
    const debuggerSent: string[] = [];

    const debuggerWs: any = {
      data: { id: 'dbg-standalone' },
      send: (msg: string) => debuggerSent.push(msg),
    };

    proxy.handleDebuggerOpen(debuggerWs);
    proxy.handleDebuggerMessage(
      debuggerWs,
      JSON.stringify({ id: 42, method: 'Page.canScreencast' })
    );

    expect(debuggerSent.length).toBe(1);
    const parsed = JSON.parse(debuggerSent[0]);
    expect(parsed.id).toBe(42);
    expect(parsed.result).toBeDefined();

    proxy.handleDebuggerClose(debuggerWs);
  });
});
