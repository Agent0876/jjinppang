import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@jjinppang/core';
import type { BundlerOptions } from '@jjinppang/core';
import { loadConfigFile } from '../config.js';
import type { BundleArguments, CliConfig } from '../types.js';

/**
 * Finds the bun executable path when running under Node.js
 */
export function findBunExecutable(): string {
  if (process.env.BUN_PATH && fs.existsSync(process.env.BUN_PATH)) {
    return process.env.BUN_PATH;
  }

  try {
    const whichCmd = os.platform() === 'win32' ? 'where bun' : 'which bun';
    const found = execSync(whichCmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (found && fs.existsSync(found)) {
      return found;
    }
  } catch {
    // not in basic PATH
  }

  const candidates = [
    path.join(os.homedir(), '.bun/bin/bun'),
    path.join(os.homedir(), '.volta/bin/bun'),
    '/opt/homebrew/bin/bun',
    '/usr/local/bin/bun',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `[jjinppang] Bun executable not found. Please install Bun from https://bun.sh or set BUN_PATH.`
  );
}

/**
 * React Native CLI command func for `bundle`
 */
export async function bundleCommand(
  argv: string[],
  cliConfig: CliConfig,
  args: BundleArguments
): Promise<void> {
  const projectRoot = cliConfig.root || process.cwd();

  // If running under Node.js (e.g. invoked by npx react-native from Xcode or Gradle),
  // spawn Bun to run the custom bundler with Bun.build engine
  if (typeof Bun === 'undefined') {
    const bunPath = findBunExecutable();
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const cliBinPath = path.resolve(currentDir, '../../bin/jjinppang.js');

    // Build arguments list to forward to bun-rn
    const forwardArgs = [cliBinPath, 'bundle'];
    if (args.entryFile) forwardArgs.push('--entry-file', args.entryFile);
    if (args.platform) forwardArgs.push('--platform', args.platform);
    if (args.dev !== undefined) forwardArgs.push('--dev', String(args.dev));
    if (args.minify !== undefined) forwardArgs.push('--minify', String(args.minify));
    if (args.bundleOutput) forwardArgs.push('--bundle-output', args.bundleOutput);
    if (args.bundleEncoding) forwardArgs.push('--bundle-encoding', args.bundleEncoding);
    if (args.sourcemapOutput) forwardArgs.push('--sourcemap-output', args.sourcemapOutput);
    if (args.sourcemapSourcesRoot)
      forwardArgs.push('--sourcemap-sources-root', args.sourcemapSourcesRoot);
    if (args.assetsDest) forwardArgs.push('--assets-dest', args.assetsDest);
    if (args.resetCache) forwardArgs.push('--reset-cache');
    if (args.config) forwardArgs.push('--config', args.config);

    const result = spawnSync(bunPath, forwardArgs, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: args.dev === false ? 'production' : 'development',
      },
    });

    if (result.status !== 0) {
      throw new Error(`[jjinppang] Bundler process exited with status ${result.status}`);
    }
    return;
  }

  // Running natively inside Bun runtime
  const fileConfig = await loadConfigFile(projectRoot, args.config);

  if (!args.entryFile) {
    throw new Error(`[jjinppang] Missing required option: --entry-file <path>`);
  }

  if (!args.bundleOutput) {
    throw new Error(`[jjinppang] Missing required option: --bundle-output <path>`);
  }

  const platform = args.platform || 'ios';
  const dev = typeof args.dev === 'boolean' ? args.dev : args.dev === 'true';
  const minify =
    typeof args.minify === 'boolean'
      ? args.minify
      : typeof fileConfig.minify === 'boolean'
        ? fileConfig.minify
        : !dev;

  console.log(`[jjinppang] Bundling for ${platform} (${dev ? 'development' : 'production'})...`);
  console.log(`[jjinppang] Entry: ${args.entryFile}`);
  console.log(`[jjinppang] Output: ${args.bundleOutput}`);

  const bundlerOptions: BundlerOptions = {
    projectRoot,
    entryFile: args.entryFile,
    platform,
    dev,
    minify,
    bundleOutput: args.bundleOutput,
    bundleEncoding: args.bundleEncoding,
    assetsDest: args.assetsDest,
    sourcemapOutput: args.sourcemapOutput,
    sourcemapSourcesRoot: args.sourcemapSourcesRoot,
    sourcemapUseAbsolutePath: args.sourcemapUseAbsolutePath,
    resetCache: args.resetCache,
    hermes: fileConfig.hermes,
    assetExtensions: fileConfig.assetExtensions,
    alias: fileConfig.alias,
    babel: fileConfig.babel,
  };

  try {
    const result = await bundle(bundlerOptions);
    const sizeKb = (result.bundleSizeBytes / 1024).toFixed(2);

    console.log(`[jjinppang] Successfully bundled in ${result.durationMs}ms!`);
    if (result.hermesCompiled && result.jsSizeBytes) {
      console.log(`[jjinppang] Minified JS size: ${(result.jsSizeBytes / 1024).toFixed(2)} KB`);
      console.log(`[jjinppang] Hermes bytecode size: ${sizeKb} KB`);
    } else {
      console.log(`[jjinppang] Bundle size: ${sizeKb} KB`);
    }
    if (result.assetsCount > 0) {
      console.log(`[jjinppang] Processed assets: ${result.assetsCount}`);
    }
    if (result.hermesCompiled) {
      console.log(`[jjinppang] Hermes bytecode compiled successfully.`);
    }
    if (result.sourcemapOutput) {
      console.log(`[jjinppang] Sourcemap: ${result.sourcemapOutput}`);
    }
  } catch (error) {
    console.error(`[jjinppang] Error during bundle:`, error);
    throw error;
  }
}
