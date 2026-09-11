import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { CliConfig, FormatArguments } from '../types.js';
import { setupOxc } from '../scaffold/oxc-setup.js';

/**
 * Finds oxfmt executable path or returns 'bunx'
 */
export function findOxfmtExecutable(projectRoot: string): { cmd: string; prefixArgs: string[] } {
  let curr = path.resolve(projectRoot);
  const binName = process.platform === 'win32' ? 'oxfmt.cmd' : 'oxfmt';
  while (true) {
    const candidate = path.join(curr, 'node_modules/.bin', binName);
    if (fs.existsSync(candidate)) {
      return { cmd: candidate, prefixArgs: [] };
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  return { cmd: 'bunx', prefixArgs: ['oxfmt'] };
}

/**
 * Command handler for `bun-rn format`
 */
export async function formatCommand(
  argv: string[],
  config: CliConfig,
  args: FormatArguments = {}
): Promise<number> {
  const projectRoot = config.root || process.cwd();
  const oxfmtrc = path.join(projectRoot, '.oxfmtrc.json');

  // If no config found, auto-generate sensible React Native default config
  if (!fs.existsSync(oxfmtrc) && !args.config) {
    console.log(
      `⚡ [jjinppang] No .oxfmtrc.json detected. Initializing default React Native config...`
    );
    setupOxc(projectRoot, false, false);
  }

  const { cmd, prefixArgs } = findOxfmtExecutable(projectRoot);
  const oxfmtArgs = [...prefixArgs];

  const isCheck = args.check || argv.includes('--check');
  if (isCheck) {
    oxfmtArgs.push('--check');
  }

  if (args.config) {
    oxfmtArgs.push('-c', args.config);
  }

  const targetDir =
    args.dir || argv.find((a) => !a.startsWith('-') && a !== 'format' && a !== 'bun-format');
  if (targetDir && targetDir !== '.') {
    oxfmtArgs.push(targetDir);
  }

  console.log(`\n⚡ [jjinppang] Running formatter (oxfmt${isCheck ? ' --check' : ''})...`);
  const result = spawnSync(cmd, oxfmtArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const statusCode = result.status ?? 0;
  if (statusCode !== 0) {
    process.exitCode = statusCode;
  }

  return statusCode;
}
