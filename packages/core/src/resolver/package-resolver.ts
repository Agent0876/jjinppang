import fs from 'node:fs';
import path from 'node:path';
import type { Platform } from '../types.js';
import { findNodeModulesPackage } from './node-modules.js';
import { resolvePackageExport } from './exports.js';
import { resolveDirectory, resolveFileWithPlatformExtensions } from './file-resolver.js';
import { cachedExistsSync } from './fs-cache.js';

/**
 * Resolves a package import (bare specifier), e.g. "react-native" or "react-native/Libraries/..."
 */
export function resolvePackageImport(
  importPath: string,
  startDir: string,
  platform: Platform
): string | null {
  // Parse package name and subpath
  let pkgName: string;
  let subpath = '';

  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    pkgName = parts.slice(0, 2).join('/');
    subpath = parts.slice(2).join('/');
  } else {
    const parts = importPath.split('/');
    pkgName = parts[0];
    subpath = parts.slice(1).join('/');
  }

  const pkgDir = findNodeModulesPackage(startDir, pkgName);
  if (!pkgDir) {
    return null;
  }

  // Parse package.json once and reuse for both exports and main/react-native field resolution
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  let pkg: Record<string, unknown> | null = null;
  if (cachedExistsSync(pkgJsonPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    } catch {
      // ignore invalid package.json
    }
  }

  // If no subpath, check package.json exports['.'] first, then fallback to resolveDirectory
  if (!subpath) {
    if (pkg?.exports) {
      const resolved = resolvePackageExport(pkg.exports, '.', pkgDir, platform);
      if (resolved) return resolved;
    }
    return resolveDirectory(pkgDir, platform);
  }

  // If subpath exists, first check package.json exports
  if (pkg?.exports) {
    const resolved = resolvePackageExport(pkg.exports, './' + subpath, pkgDir, platform);
    if (resolved) return resolved;
  }

  // Legacy AssetRegistry fallback in React Native 0.87+
  if (pkgName === 'react-native' && subpath === 'Libraries/Image/AssetRegistry') {
    const modernPath = path.join(pkgDir, 'src/asset-registry.js');
    if (cachedExistsSync(modernPath)) {
      return modernPath;
    }
  }

  // Direct file or directory in package
  const directTarget = path.resolve(pkgDir, subpath);
  return (
    resolveFileWithPlatformExtensions(directTarget, platform) ||
    resolveDirectory(directTarget, platform)
  );
}
