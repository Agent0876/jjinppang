import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { CliConfig, LintArguments } from '../types.js';
import { setupOxc } from '../scaffold/oxc-setup.js';

/**
 * Finds oxlint executable path or returns 'bunx'
 */
export function findOxlintExecutable(projectRoot: string): { cmd: string; prefixArgs: string[] } {
  let curr = path.resolve(projectRoot);
  const binName = process.platform === 'win32' ? 'oxlint.cmd' : 'oxlint';
  while (true) {
    const candidate = path.join(curr, 'node_modules/.bin', binName);
    if (fs.existsSync(candidate)) {
      return { cmd: candidate, prefixArgs: [] };
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  return { cmd: 'bunx', prefixArgs: ['oxlint'] };
}

/**
 * Command handler for `bun-rn lint` (similar to Next.js `next lint`)
 */
export async function lintCommand(
  argv: string[],
  config: CliConfig,
  args: LintArguments = {}
): Promise<number> {
  const projectRoot = config.root || process.cwd();
  const oxlintrc = path.join(projectRoot, '.oxlintrc.json');

  // If no config found, auto-generate sensible React Native default config (like next lint)
  if (!fs.existsSync(oxlintrc) && !args.config) {
    console.log(
      `⚡ [jjinppang] No .oxlintrc.json detected. Initializing default React Native config...`
    );
    setupOxc(projectRoot, false, false);
  }

  const { cmd, prefixArgs } = findOxlintExecutable(projectRoot);
  const oxlintArgs = [...prefixArgs];

  if (args.fix || argv.includes('--fix')) {
    oxlintArgs.push('--fix');
  }

  if (args.config) {
    oxlintArgs.push('-c', args.config);
  }

  const targetDir =
    args.dir || argv.find((a) => !a.startsWith('-') && a !== 'lint' && a !== 'bun-lint');
  if (targetDir && targetDir !== '.') {
    oxlintArgs.push(targetDir);
  }

  console.log(`\n⚡ [jjinppang] Running linter (oxlint)...`);
  const result = spawnSync(cmd, oxlintArgs, {
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
