import fs from 'node:fs';
import path from 'node:path';
import type { Platform } from '../types.js';
import { resolveFileWithPlatformExtensions } from './file-resolver.js';

/**
 * Resolves a package subpath against modern package.json "exports" field
 */
export function resolvePackageExport(
  exportsField: unknown,
  subpath: string,
  pkgDir: string,
  platform: Platform
): string | null {
  if (!exportsField) return null;

  if (typeof exportsField === 'string' && (subpath === '.' || subpath === './')) {
    const target = path.resolve(pkgDir, exportsField);
    return resolveFileWithPlatformExtensions(target, platform);
  }

  if (typeof exportsField === 'object') {
    const exportsObj = exportsField as Record<string, unknown>;

    if (exportsObj[subpath]) {
      const match = exportsObj[subpath];
      if (typeof match === 'string') {
        const target = path.resolve(pkgDir, match);
        return resolveFileWithPlatformExtensions(target, platform);
      }
      if (typeof match === 'object' && match !== null) {
        return resolveExportConditions(match as Record<string, unknown>, pkgDir, platform);
      }
    }

    if (subpath === '.' || subpath === './') {
      return resolveExportConditions(exportsObj, pkgDir, platform);
    }
  }

  return null;
}

/**
 * Evaluates export condition objects prioritizing React Native platform rules
 */
export function resolveExportConditions(
  conditions: Record<string, unknown>,
  pkgDir: string,
  platform: Platform
): string | null {
  const priorityKeys = [
    `react-native-${platform}`,
    'react-native',
    'browser',
    'import',
    'require',
    'default',
  ];

  for (const key of priorityKeys) {
    const val = conditions[key];
    if (typeof val === 'string') {
      const target = path.resolve(pkgDir, val);
      const resolved = resolveFileWithPlatformExtensions(target, platform);
      if (resolved) return resolved;
    } else if (typeof val === 'object' && val !== null) {
      const nested = resolveExportConditions(val as Record<string, unknown>, pkgDir, platform);
      if (nested) return nested;
    }
  }

  return null;
}
