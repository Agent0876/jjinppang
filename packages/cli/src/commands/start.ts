import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDevServer } from '@jjinppang/core';
import { loadConfigFile } from '../config.js';
import type { CliConfig, StartArguments } from '../types.js';
import { findBunExecutable } from './bundle.js';

/**
 * React Native CLI command func for `start`
 */
export async function startCommand(
  argv: string[],
  cliConfig: CliConfig,
  args: StartArguments
): Promise<void> {
  const projectRoot = args.projectRoot || cliConfig.root || process.cwd();

  // If running under Node.js (e.g. standard npx react-native start),
  // spawn Bun to run the dev server with Bun.serve engine
  if (typeof Bun === 'undefined') {
    const bunPath = findBunExecutable();
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const cliBinPath = path.resolve(currentDir, '../../bin/jjinppang.js');

    const forwardArgs = [cliBinPath, 'start'];
    if (args.port !== undefined) forwardArgs.push('--port', String(args.port));
    if (args.host) forwardArgs.push('--host', args.host);
    if (args.resetCache) forwardArgs.push('--reset-cache');
    if (args.config) forwardArgs.push('--config', args.config);
    if (args.projectRoot) forwardArgs.push('--projectRoot', args.projectRoot);

    const child = spawn(bunPath, forwardArgs, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    });

    return new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Dev server exited with code ${code}`));
      });
    });
  }

  // Running natively inside Bun runtime
  const fileConfig = await loadConfigFile(projectRoot, args.config);

  const port = args.port ? Number(args.port) : 8081;
  const host = args.host || 'localhost';

  const devServer = await startDevServer({
    projectRoot,
    port,
    host,
    resetCache: args.resetCache,
    assetExtensions: fileConfig.assetExtensions,
    alias: fileConfig.alias,
    babel: fileConfig.babel,
    hermes: fileConfig.hermes,
  });

  // Handle termination signals
  const cleanup = () => {
    console.log('\n[DevServer] Stopping React Native Bun Dev Server...');
    devServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep alive
  await new Promise(() => {});
}
