import fs from 'node:fs';
import path from 'node:path';
import type { Platform } from '../types.js';
import { createPlatformExtensions } from './extensions.js';

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
    const candidateExts = [`.${platform}${ext}`];
    if (platform === 'macos') {
      candidateExts.push(`.ios${ext}`);
    }
    candidateExts.push(
      `.native${ext}`,
      `.${platform}.tsx`,
      `.${platform}.ts`,
      `.${platform}.jsx`,
      `.${platform}.js`
    );
    if (platform === 'macos') {
      candidateExts.push('.ios.tsx', '.ios.ts', '.ios.jsx', '.ios.js');
    }
    candidateExts.push('.native.tsx', '.native.ts', '.native.jsx', '.native.js');

    for (const platformExt of candidateExts) {
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
 * Resolves directory entry point by checking package.json main/react-native fields
 * or platform-specific index files (e.g. index.ios.tsx, index.tsx, index.js).
 */
export function resolveDirectory(dirPath: string, platform: Platform): string | null {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return null;
  }

  const pkgJsonPath = path.join(dirPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
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
