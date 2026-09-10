import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export type PackageManagerType = 'bun' | 'npm' | 'yarn' | 'pnpm';

/**
 * Detects package manager based on project lockfiles or system availability
 */
export function detectPackageManager(projectDir: string): PackageManagerType {
  if (
    fs.existsSync(path.join(projectDir, 'bun.lock')) ||
    fs.existsSync(path.join(projectDir, 'bun.lockb'))
  ) {
    return 'bun';
  }
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(projectDir, 'package-lock.json'))) {
    return 'npm';
  }

  // Check if bun binary is globally available
  try {
    const res = spawnSync('bun', ['--version'], { stdio: 'ignore' });
    if (res.status === 0) return 'bun';
  } catch {
    // ignore
  }

  return 'npm';
}
