import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { HermesOptions } from './types.js';

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
 * Searches for the hermesc executable binary
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

export interface CompileWithHermesParams {
  projectRoot: string;
  bundleOutput: string;
  sourcemapOutput?: string;
  options?: HermesOptions;
}

/**
 * Compiles a JS bundle into Hermes Bytecode (.hbc) using hermesc
 * and composes sourcemaps if requested.
 */
export function compileWithHermes(params: CompileWithHermesParams): boolean {
  const { projectRoot, bundleOutput, sourcemapOutput, options } = params;

  const hermescPath = findHermescPath(projectRoot, options);
  if (!hermescPath) {
    console.warn(
      `[react-native-bun-build] Warning: hermesc compiler binary not found. Keeping bundle as standard JavaScript.`
    );
    return false;
  }

  const hbcOutput = `${bundleOutput}.hbc`;
  const hbcMapOutput = `${bundleOutput}.hbc.map`;

  const flags: string[] = ['-emit-binary', '-out', hbcOutput, bundleOutput, '-O'];

  if (sourcemapOutput) {
    flags.push('-output-source-map');
  }

  if (options?.flags) {
    flags.push(...options.flags);
  }

  const result = spawnSync(hermescPath, flags, {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(
      `[react-native-bun-build] Hermes bytecode compilation failed with status ${result.status}`
    );
  }

  // Replace JS bundle with HBC file
  if (fs.existsSync(hbcOutput)) {
    fs.renameSync(hbcOutput, bundleOutput);
  }

  // Compose sourcemaps if sourcemapOutput was requested
  if (sourcemapOutput && fs.existsSync(sourcemapOutput) && fs.existsSync(hbcMapOutput)) {
    composeSourceMaps(projectRoot, sourcemapOutput, hbcMapOutput, sourcemapOutput);
    // clean up intermediate hbc map
    if (fs.existsSync(hbcMapOutput)) {
      fs.unlinkSync(hbcMapOutput);
    }
  }

  return true;
}

/**
 * Compose packager sourcemap and hermes bytecode sourcemap
 */
export function composeSourceMaps(
  projectRoot: string,
  packagerMap: string,
  hermesMap: string,
  outputMap: string
): void {
  const composeScriptCandidates = [
    path.join(projectRoot, 'node_modules/react-native/scripts/compose-source-maps.js'),
    path.join(
      projectRoot,
      'node_modules/@react-native/community-cli-plugin/dist/commands/bundle/composeSourceMaps.js'
    ),
  ];

  for (const script of composeScriptCandidates) {
    if (fs.existsSync(script)) {
      try {
        const res = spawnSync(process.execPath, [script, packagerMap, hermesMap, '-o', outputMap], {
          stdio: 'pipe',
        });
        if (res.status === 0) {
          return;
        }
      } catch {
        // continue to fallback
      }
    }
  }

  // If compose script not found or failed, keep the Hermes map or packager map
  try {
    if (fs.existsSync(hermesMap)) {
      fs.copyFileSync(hermesMap, outputMap);
    }
  } catch {
    // ignore
  }
}
