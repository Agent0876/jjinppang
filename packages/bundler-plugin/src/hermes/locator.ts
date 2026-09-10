import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { HermesOptions } from '../types.js';

export function getHermescPlatformDir(): string {
  const platform = os.platform();

  if (platform === 'darwin') {
    return 'osx-bin';
  } else if (platform === 'linux') {
    return 'linux64-bin';
  } else if (platform === 'win32') {
    return 'win64-bin';
  }
  return `${platform}-bin`;
}

/**
 * Searches for the hermesc executable binary across standard React Native / Hermes SDK paths
 */
export function findHermescPath(projectRoot: string, options?: HermesOptions): string | null {
  // 1. Explicit option or environment variable
  if (options?.hermescPath && fs.existsSync(options.hermescPath)) {
    return options.hermescPath;
  }
  if (process.env.HERMES_CLI_PATH && fs.existsSync(process.env.HERMES_CLI_PATH)) {
    return process.env.HERMES_CLI_PATH;
  }

  const platformDir = getHermescPlatformDir();
  const binaryName = os.platform() === 'win32' ? 'hermesc.exe' : 'hermesc';

  // 2. React Native SDK hermesc / hermes-compiler / hermes-engine
  const rnCandidates = [
    path.join(projectRoot, 'node_modules/hermes-compiler/hermesc', platformDir, binaryName),
    path.join(projectRoot, 'node_modules/hermes-compiler/hermesc/osx-bin', binaryName),
    path.join(projectRoot, 'node_modules/hermes-compiler/hermesc/osx-arm64', binaryName),
    path.join(projectRoot, 'node_modules/hermes-compiler/hermesc', binaryName),
    path.join(projectRoot, 'node_modules/react-native/sdks/hermesc', platformDir, binaryName),
    path.join(projectRoot, 'node_modules/react-native/sdks/hermesc/osx-arm64', binaryName),
    path.join(projectRoot, 'node_modules/react-native/sdks/hermesc/osx-bin', binaryName),
    path.join(projectRoot, 'node_modules/react-native-macos/sdks/hermesc', platformDir, binaryName),
    path.join(projectRoot, 'node_modules/react-native-macos/sdks/hermesc/osx-arm64', binaryName),
    path.join(projectRoot, 'node_modules/react-native-macos/sdks/hermesc/osx-bin', binaryName),
    path.join(
      projectRoot,
      'node_modules/react-native-windows/sdks/hermesc',
      platformDir,
      binaryName
    ),
    path.join(projectRoot, 'node_modules/react-native-windows/sdks/hermesc/win64-bin', binaryName),
    path.join(projectRoot, 'node_modules/hermes-engine', platformDir, binaryName),
    path.join(projectRoot, 'node_modules/hermes-engine/osx-arm64', binaryName),
    path.join(projectRoot, 'node_modules/hermes-engine/osx-bin', binaryName),
  ];

  for (const candidate of rnCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. System PATH
  try {
    const whichCmd = os.platform() === 'win32' ? 'where' : 'which';
    const result = execSync(`${whichCmd} ${binaryName}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    // not in PATH
  }

  return null;
}
