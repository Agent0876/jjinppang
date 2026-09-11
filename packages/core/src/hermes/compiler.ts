import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import type { HermesOptions } from '../types.js';
import { findHermescPath } from './locator.js';
import { composeSourceMaps } from './sourcemap.js';

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

  const flags: string[] = ['-emit-binary', '-out', hbcOutput, bundleOutput, '-Xes6-class'];

  if (sourcemapOutput) {
    flags.push('-output-source-map');
  }

  const extraFlags = options?.flags && options.flags.length > 0 ? options.flags : ['-O'];
  for (const flag of extraFlags) {
    if (!flags.includes(flag)) {
      flags.push(flag);
    }
  }

  const result = spawnSync(hermescPath, flags, {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    if (result.error) console.error('Hermesc error:', result.error);
    if (result.signal) console.error('Hermesc killed by signal:', result.signal);
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
