import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { colors } from './colors.js';

export interface InteractiveServerController {
  broadcastReload: (reason?: string) => void;
  broadcastDevMenu: () => void;
  stop: () => void;
}

/**
 * Prints the interactive keyboard commands menu to the terminal
 */
export function printInteractiveMenu(): void {
  console.log(
    `\n  ${colors.dim}────────────────────────────────────────────────────────────${colors.reset}\n` +
      `  ${colors.brightYellow}⌨️  Commands:${colors.reset}\n` +
      `    ${colors.bold}${colors.brightCyan}r${colors.reset}  ${colors.dim}›${colors.reset}  Reload connected apps\n` +
      `    ${colors.bold}${colors.brightCyan}d${colors.reset}  ${colors.dim}›${colors.reset}  Open in-app Developer Menu\n` +
      `    ${colors.bold}${colors.brightCyan}i${colors.reset}  ${colors.dim}›${colors.reset}  Run / open iOS Simulator\n` +
      `    ${colors.bold}${colors.brightCyan}a${colors.reset}  ${colors.dim}›${colors.reset}  Run / open Android Emulator / ADB reverse\n` +
      `    ${colors.bold}${colors.brightCyan}c${colors.reset}  ${colors.dim}›${colors.reset}  Clear terminal console\n` +
      `    ${colors.bold}${colors.brightCyan}q${colors.reset}  ${colors.dim}›${colors.reset}  Quit dev server\n` +
      `  ${colors.dim}────────────────────────────────────────────────────────────${colors.reset}\n`
  );
}

/**
 * Attempts to send Android ADB broadcast or keyevent
 */
function sendAdbCommand(args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('adb', args, { stdio: 'ignore' });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Attempts to launch or focus iOS Simulator on macOS
 */
function openIosSimulator(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform !== 'darwin') {
      console.log(
        `\n  ${colors.yellow}⚠️  iOS Simulator is only available on macOS.${colors.reset}`
      );
      return resolve(false);
    }
    const proc = spawn('open', ['-a', 'Simulator'], { stdio: 'ignore' });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`\n  ${colors.brightGreen}📱 iOS Simulator opened.${colors.reset}`);
      }
      resolve(code === 0);
    });
  });
}

/**
 * Sets up interactive keyboard listener on process.stdin
 */
export function setupInteractiveKeyboard(controller: InteractiveServerController): () => void {
  if (!process.stdin.isTTY) {
    return () => {};
  }

  readline.emitKeypressEvents(process.stdin);
  try {
    process.stdin.setRawMode(true);
  } catch {
    return () => {};
  }
  process.stdin.resume();

  printInteractiveMenu();

  const handleKeypress = async (_str: string, key: readline.Key) => {
    if (key.ctrl && key.name === 'c') {
      console.log(`\n  ${colors.dim}Shutting down dev server...${colors.reset}`);
      controller.stop();
      process.exit(0);
    }

    const input = key.name?.toLowerCase();
    switch (input) {
      case 'r': {
        console.log(
          `\n  ${colors.brightCyan}⚡ [Reload] Broadcasting reload to all connected devices...${colors.reset}`
        );
        controller.broadcastReload('Manual keyboard reload (r)');
        // Also trigger ADB reload broadcast on Android
        sendAdbCommand([
          'shell',
          'am',
          'broadcast',
          '-a',
          'com.facebook.react.mobile.action.RELOAD',
        ]).catch(() => {});
        break;
      }
      case 'd': {
        console.log(
          `\n  ${colors.brightMagenta}🛠️  [DevMenu] Opening developer menu on connected devices...${colors.reset}`
        );
        controller.broadcastDevMenu();
        // Android keyevent 82 opens Dev Menu
        sendAdbCommand(['shell', 'input', 'keyevent', '82']).catch(() => {});
        break;
      }
      case 'i': {
        console.log(`\n  ${colors.brightBlue}🍎 [iOS] Launching iOS Simulator...${colors.reset}`);
        openIosSimulator().catch(() => {});
        break;
      }
      case 'a': {
        console.log(
          `\n  ${colors.brightGreen}🤖 [Android] Setting up ADB reverse socket (tcp:8081)...${colors.reset}`
        );
        const ok = await sendAdbCommand(['reverse', 'tcp:8081', 'tcp:8081']);
        if (ok) {
          console.log(`  ${colors.brightGreen}✔ ADB reverse tcp:8081 configured.${colors.reset}`);
        } else {
          console.log(
            `  ${colors.yellow}⚠️  No ADB device detected or ADB not installed.${colors.reset}`
          );
        }
        break;
      }
      case 'c': {
        console.clear();
        printInteractiveMenu();
        break;
      }
      case 'q': {
        console.log(`\n  ${colors.dim}Stopping React Native Bun Dev Server...${colors.reset}`);
        controller.stop();
        process.exit(0);
        break;
      }
      default:
        break;
    }
  };

  process.stdin.on('keypress', handleKeypress);

  return () => {
    try {
      process.stdin.removeListener('keypress', handleKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    } catch {}
  };
}
