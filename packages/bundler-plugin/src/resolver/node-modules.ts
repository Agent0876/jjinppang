import fs from 'node:fs';
import path from 'node:path';

/**
 * Searches for a node_modules package by walking up from startDir
 */
export function findNodeModulesPackage(startDir: string, pkgName: string): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (true) {
    const candidate = path.join(currentDir, 'node_modules', pkgName);
    if (fs.existsSync(candidate)) {
      return fs.realpathSync(candidate);
    }
    if (currentDir === root) break;
    currentDir = path.dirname(currentDir);
  }

  return null;
}
