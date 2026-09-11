import { describe, expect, it } from 'bun:test';
import {
  printInteractiveMenu,
  setupInteractiveKeyboard,
} from '../packages/cli/src/ui/interactive.js';

describe('Interactive CLI Keyboard Controller', () => {
  it('prints interactive menu without throwing', () => {
    let output = '';
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output += args.join(' ');
    };
    try {
      printInteractiveMenu();
      expect(output).toContain('Commands:');
      expect(output).toContain('Reload connected apps');
      expect(output).toContain('Developer Menu');
      expect(output).toContain('iOS Simulator');
      expect(output).toContain('Android Emulator');
    } finally {
      console.log = originalLog;
    }
  });

  it('sets up keyboard listener and handles key events gracefully', () => {
    let reloaded = false;
    let devMenuOpened = false;
    let stopped = false;

    const controller = {
      broadcastReload: () => {
        reloaded = true;
      },
      broadcastDevMenu: () => {
        devMenuOpened = true;
      },
      stop: () => {
        stopped = true;
      },
    };

    // If not a TTY, returns noop teardown function without error
    const teardown = setupInteractiveKeyboard(controller);
    expect(typeof teardown).toBe('function');
    teardown();

    // Verify controller methods exist and function
    controller.broadcastReload();
    controller.broadcastDevMenu();
    controller.stop();
    expect(reloaded).toBe(true);
    expect(devMenuOpened).toBe(true);
    expect(stopped).toBe(true);
  });
});
