import path from 'node:path';
import { cachedExistsSync, cachedRealpathSync } from './fs-cache.js';

/**
 * Searches for a node_modules package by walking up from startDir
 */
export function findNodeModulesPackage(startDir: string, pkgName: string): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (true) {
    const candidate = path.join(currentDir, 'node_modules', pkgName);
    if (cachedExistsSync(candidate)) {
      return cachedRealpathSync(candidate);
    }
    if (currentDir === root) break;
    currentDir = path.dirname(currentDir);
  }

  return null;
}
