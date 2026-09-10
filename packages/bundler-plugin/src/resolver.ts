import fs from 'node:fs';
import path from 'node:path';
import type { BunPlugin } from 'bun';
import type { Platform } from './types.js';

export interface ResolverOptions {
  platform: Platform;
  projectRoot: string;
  alias?: Record<string, string>;
}

export function createPlatformExtensions(platform: Platform): string[] {
  return [
    `.${platform}.tsx`,
    `.${platform}.ts`,
    `.${platform}.jsx`,
    `.${platform}.js`,
    `.native.tsx`,
    `.native.ts`,
    `.native.jsx`,
    `.native.js`,
    `.tsx`,
    `.ts`,
    `.jsx`,
    `.js`,
    `.json`,
  ];
}

/**
 * Given a base path (with or without extension), checks for platform-specific
 * extension variants according to React Native resolution priority.
 */
export function resolveFileWithPlatformExtensions(
  filePath: string,
  platform: Platform
): string | null {
  const ext = path.extname(filePath);
  const extensions = createPlatformExtensions(platform);

  // If path already has an extension (like .js or .jsx), check if a platform-specific
  // variant exists first (e.g. Button.ios.js over Button.js)
  if (ext && /\.(jsx?|tsx?|json)$/i.test(ext)) {
    const basePathWithoutExt = filePath.slice(0, -ext.length);
    for (const platformExt of [
      `.${platform}${ext}`,
      `.native${ext}`,
      `.${platform}.tsx`,
      `.${platform}.ts`,
      `.${platform}.jsx`,
      `.${platform}.js`,
      `.native.tsx`,
      `.native.ts`,
      `.native.jsx`,
      `.native.js`,
    ]) {
      const candidate = basePathWithoutExt + platformExt;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return fs.realpathSync(candidate);
      }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.realpathSync(filePath);
    }
  }

  // Exact match first if it's already a complete file (like .png or custom)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return fs.realpathSync(filePath);
  }

  // Try appending platform extensions
  for (const candidateExt of extensions) {
    const candidate = filePath + candidateExt;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return fs.realpathSync(candidate);
    }
  }

  return null;
}

/**
 * Resolve directory import by checking package.json (react-native, main, etc.)
 * or index files with platform extensions.
 */
export function resolveDirectory(
  dirPath: string,
  platform: Platform
): string | null {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const pkgJsonPath = path.join(dirPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      // Check react-native main field first
      if (typeof pkg['react-native'] === 'string') {
        const rnTarget = path.resolve(dirPath, pkg['react-native']);
        const resolved =
          resolveFileWithPlatformExtensions(rnTarget, platform) ||
          resolveDirectory(rnTarget, platform);
        if (resolved) return resolved;
      }

      // Check exports if defined
      if (pkg.exports) {
        const resolvedExport = resolvePackageExport(pkg.exports, '.', dirPath, platform);
        if (resolvedExport) return resolvedExport;
      }

      // Check main field
      if (typeof pkg.main === 'string') {
        const mainTarget = path.resolve(dirPath, pkg.main);
        const resolved =
          resolveFileWithPlatformExtensions(mainTarget, platform) ||
          resolveDirectory(mainTarget, platform);
        if (resolved) return resolved;
      }
    } catch {
      // ignore JSON parse error and fallback to index
    }
  }

  // Check index files
  const indexBase = path.join(dirPath, 'index');
  const resolvedIndex = resolveFileWithPlatformExtensions(indexBase, platform);
  if (resolvedIndex) {
    return resolvedIndex;
  }

  return null;
}

/**
 * Resolves subpath against package.json "exports" field
 */
function resolvePackageExport(
  exportsField: unknown,
  subpath: string,
  packageDir: string,
  platform: Platform
): string | null {
  if (!exportsField) return null;

  if (typeof exportsField === 'string') {
    if (subpath === '.') {
      const target = path.resolve(packageDir, exportsField);
      return (
        resolveFileWithPlatformExtensions(target, platform) ||
        resolveDirectory(target, platform)
      );
    }
    return null;
  }

  if (typeof exportsField === 'object') {
    const exportsObj = exportsField as Record<string, unknown>;

    // Case 1: Root conditional export: { "react-native": "...", "import": "...", "default": "..." }
    if (subpath === '.' && ('react-native' in exportsObj || 'import' in exportsObj || 'require' in exportsObj || 'default' in exportsObj)) {
      const condition =
        exportsObj['react-native'] ??
        exportsObj['import'] ??
        exportsObj['require'] ??
        exportsObj['default'];
      if (typeof condition === 'string') {
        const target = path.resolve(packageDir, condition);
        return (
          resolveFileWithPlatformExtensions(target, platform) ||
          resolveDirectory(target, platform)
        );
      }
      if (typeof condition === 'object' && condition !== null) {
        return resolvePackageExport(condition, subpath, packageDir, platform);
      }
    }

    // Case 2: Subpath mapping: { ".": ..., "./foo": ... }
    const exportTarget = exportsObj[subpath];
    if (exportTarget) {
      if (typeof exportTarget === 'string') {
        const target = path.resolve(packageDir, exportTarget);
        return (
          resolveFileWithPlatformExtensions(target, platform) ||
          resolveDirectory(target, platform)
        );
      }
      if (typeof exportTarget === 'object') {
        return resolvePackageExport(exportTarget, '.', packageDir, platform);
      }
    }
  }

  return null;
}

/**
 * Searches for a node_modules package by walking up from startDir
 */
export function findNodeModulesPackage(
  startDir: string,
  pkgName: string
): string | null {
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

  // If no subpath, resolve package entry point
  if (!subpath) {
    return resolveDirectory(pkgDir, platform);
  }

  // If subpath exists, first check package.json exports
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkg.exports) {
        const resolved = resolvePackageExport(
          pkg.exports,
          './' + subpath,
          pkgDir,
          platform
        );
        if (resolved) return resolved;
      }
    } catch {
      // ignore
    }
  }

  // Legacy AssetRegistry fallback in React Native 0.87+
  if (pkgName === 'react-native' && subpath === 'Libraries/Image/AssetRegistry') {
    const modernPath = path.join(pkgDir, 'src/asset-registry.js');
    if (fs.existsSync(modernPath)) {
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

  // 4. Package in node_modules
  return (
    resolvePackageImport(effectiveSpecifier, fromDir, platform) ||
    resolvePackageImport(effectiveSpecifier, projectRoot, platform)
  );
}

/**
 * Creates the Bun.build plugin for React Native platform resolution
 */
export function createResolverPlugin(options: ResolverOptions): BunPlugin {
  return {
    name: 'react-native-resolver',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        // Skip Bun internal namespaces or empty paths
        if (args.path.startsWith('\0')) {
          return undefined;
        }

        const fromDir = args.resolveDir
          ? args.resolveDir
          : args.importer
            ? path.dirname(args.importer)
            : options.projectRoot;

        const resolved = resolveSpecifier(args.path, fromDir, options);

        if (resolved) {
          // If already pointing to the exact same path and it's absolute, avoid infinite recursion
          if (args.path === resolved) {
            return undefined;
          }
          return { path: resolved };
        }

        return undefined;
      });
    },
  };
}
