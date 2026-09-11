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
      `[jjinppang] Warning: hermesc compiler binary not found. Keeping bundle as standard JavaScript.`
    );
    return false;
  }

  const hbcOutput = `${bundleOutput}.hbc`;
  const hbcMapOutput = `${bundleOutput}.hbc.map`;

  const flags: string[] = ['-emit-binary', '-out', hbcOutput, bundleOutput];

  if (sourcemapOutput) {
    flags.push('-output-source-map');
  }

  const defaultFlags = ['-O', '-fstrip-function-names', '-fstatic-builtins'];
  const extraFlags = options?.flags && options.flags.length > 0 ? options.flags : defaultFlags;
  for (const flag of extraFlags) {
    if (!flags.includes(flag)) {
      flags.push(flag);
    }
  }

  let result = spawnSync(hermescPath, flags, {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  if (result.status !== 0 && process.platform === 'darwin' && process.arch === 'arm64') {
    // Retry with x86_64 via Rosetta if arm64 segfaults under Bun process memory mapping
    result = spawnSync('arch', ['-x86_64', hermescPath, ...flags], {
      stdio: 'inherit',
      encoding: 'utf8',
    });
  }

  if (result.status !== 0) {
    if (result.error) console.error('Hermesc error:', result.error);
    if (result.signal) console.error('Hermesc killed by signal:', result.signal);
    throw new Error(`[jjinppang] Hermes bytecode compilation failed with status ${result.status}`);
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
