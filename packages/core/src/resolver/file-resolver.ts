import fs from 'node:fs';
import path from 'node:path';
import type { Platform } from '../types.js';
import { createPlatformExtensions } from './extensions.js';
import { cachedIsFile, cachedRealpathSync, cachedExistsSync } from './fs-cache.js';

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

    // Build candidate extensions with deduplication
    const candidateExts: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (e: string) => {
      if (!seen.has(e)) {
        seen.add(e);
        candidateExts.push(e);
      }
    };

    addCandidate(`.${platform}${ext}`);
    if (platform === 'macos') {
      addCandidate(`.ios${ext}`);
    }
    addCandidate(`.native${ext}`);
    addCandidate(`.${platform}.tsx`);
    addCandidate(`.${platform}.ts`);
    addCandidate(`.${platform}.jsx`);
    addCandidate(`.${platform}.js`);
    if (platform === 'macos') {
      addCandidate('.ios.tsx');
      addCandidate('.ios.ts');
      addCandidate('.ios.jsx');
      addCandidate('.ios.js');
    }
    addCandidate('.native.tsx');
    addCandidate('.native.ts');
    addCandidate('.native.jsx');
    addCandidate('.native.js');

    for (const platformExt of candidateExts) {
      const candidate = basePathWithoutExt + platformExt;
      if (cachedIsFile(candidate)) {
        return cachedRealpathSync(candidate);
      }
    }

    if (cachedIsFile(filePath)) {
      return cachedRealpathSync(filePath);
    }
  }

  // Exact match first if it's already a complete file (like .png or custom)
  if (cachedIsFile(filePath)) {
    return cachedRealpathSync(filePath);
  }

  // Try appending platform extensions
  for (const candidateExt of extensions) {
    const candidate = filePath + candidateExt;
    if (cachedIsFile(candidate)) {
      return cachedRealpathSync(candidate);
    }
  }

  return null;
}

/**
 * Resolves directory entry point by checking package.json main/react-native fields
 * or platform-specific index files (e.g. index.ios.tsx, index.tsx, index.js).
 */
export function resolveDirectory(dirPath: string, platform: Platform): string | null {
  if (!cachedExistsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const pkgJsonPath = path.join(dirPath, 'package.json');
  if (cachedExistsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      // 1. package.json "react-native" field
      if (pkg['react-native'] && typeof pkg['react-native'] === 'string') {
        const rnFieldTarget = path.resolve(dirPath, pkg['react-native']);
        const resolved =
          resolveFileWithPlatformExtensions(rnFieldTarget, platform) ||
          resolveDirectory(rnFieldTarget, platform);
        if (resolved) return resolved;
      }

      // 2. package.json "main" field
      if (pkg.main && typeof pkg.main === 'string') {
        const mainTarget = path.resolve(dirPath, pkg.main);
        const resolved =
          resolveFileWithPlatformExtensions(mainTarget, platform) ||
          resolveDirectory(mainTarget, platform);
        if (resolved) return resolved;
      }
    } catch {
      // ignore invalid package.json and fallback to index
    }
  }

  // Fallback to index with platform extensions
  const indexBase = path.join(dirPath, 'index');
  return resolveFileWithPlatformExtensions(indexBase, platform);
}
