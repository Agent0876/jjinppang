import path from 'node:path';
import type { Platform } from '../types.js';
import { redirectDesktopSpecifier } from './desktop-redirect.js';
import { resolveDirectory, resolveFileWithPlatformExtensions } from './file-resolver.js';
import { resolvePackageImport } from './package-resolver.js';

export interface ResolverOptions {
  platform: Platform;
  projectRoot: string;
  alias?: Record<string, string>;
}

/**
 * Main resolution function for an import specifier
 */
export function resolveSpecifier(
  specifier: string,
  fromDir: string,
  options: ResolverOptions
): string | null {
  const { platform, projectRoot, alias = {} } = options;

  // 1. Check custom alias
  let effectiveSpecifier = specifier;
  for (const [aliasKey, aliasTarget] of Object.entries(alias)) {
    if (effectiveSpecifier === aliasKey) {
      effectiveSpecifier = path.isAbsolute(aliasTarget)
        ? aliasTarget
        : path.resolve(projectRoot, aliasTarget);
      break;
    } else if (effectiveSpecifier.startsWith(aliasKey + '/')) {
      const remainder = effectiveSpecifier.slice(aliasKey.length + 1);
      const targetBase = path.isAbsolute(aliasTarget)
        ? aliasTarget
        : path.resolve(projectRoot, aliasTarget);
      effectiveSpecifier = path.join(targetBase, remainder);
      break;
    }
  }

  // 2. Relative or absolute path
  if (
    effectiveSpecifier.startsWith('.') ||
    effectiveSpecifier.startsWith('/') ||
    path.isAbsolute(effectiveSpecifier)
  ) {
    const absoluteTarget = path.isAbsolute(effectiveSpecifier)
      ? effectiveSpecifier
      : path.resolve(fromDir, effectiveSpecifier);

    return (
      resolveFileWithPlatformExtensions(absoluteTarget, platform) ||
      resolveDirectory(absoluteTarget, platform)
    );
  }

  // 3. Node built-in module (node:fs, fs, path, etc.)
  if (effectiveSpecifier.startsWith('node:')) {
    return null; // Let Bun handle built-in node modules
  }

  // 3.5. Desktop platform package redirect (react-native -> react-native-macos / react-native-windows)
  effectiveSpecifier = redirectDesktopSpecifier(effectiveSpecifier, fromDir, projectRoot, platform);

  // 4. Package in node_modules
  return (
    resolvePackageImport(effectiveSpecifier, fromDir, platform) ||
    resolvePackageImport(effectiveSpecifier, projectRoot, platform)
  );
}
