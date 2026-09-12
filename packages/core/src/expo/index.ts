import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JjinppangConfig, Platform } from '../types.js';

export interface ExpoMetroConfig {
  transformer?: Record<string, any>;
  resolver?: {
    sourceExts?: string[];
    assetExts?: string[];
    platforms?: string[];
    extraNodeModules?: Record<string, string>;
    [key: string]: any;
  };
  serializer?: Record<string, any>;
  server?: Record<string, any>;
  watcher?: Record<string, any>;
  [key: string]: any;
}

/**
 * Dynamically resolves the jjinppang version from the nearest package.json
 */
function getJjinppangVersion(): string {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    let dir = currentDir;
    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === '@jjinppang/core' || pkg.name === 'jjinppang') {
          return pkg.version || '0.1.0';
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // fallback
  }
  return '0.1.0';
}

/**
 * Adapts an Expo or Metro configuration to work seamlessly with jjinppang.
 * Injects platform extensions, custom aliases, asset extensions, and Hermes flags.
 *
 * Usage in metro.config.js:
 * ```js
 * const { getDefaultConfig } = require('expo/metro-config');
 * const { withJjinppang } = require('@jjinppang/core');
 *
 * const config = getDefaultConfig(__dirname);
 * module.exports = withJjinppang(config, {
 *   minify: true,
 * });
 * ```
 */
export function withJjinppang<T extends ExpoMetroConfig>(
  expoConfig: T,
  jjinppangConfig?: JjinppangConfig
): T {
  const merged: T = { ...expoConfig };

  if (!merged.resolver) {
    merged.resolver = {};
  }

  // Ensure standard and custom asset extensions are handled
  const defaultAssetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'ttf', 'otf'];
  const userAssetExts = jjinppangConfig?.assetExtensions || [];
  merged.resolver.assetExts = Array.from(
    new Set([...(merged.resolver.assetExts || defaultAssetExts), ...userAssetExts])
  );

  // Ensure platform extensions are registered
  const platforms: Platform[] = ['ios', 'android', 'macos', 'windows'];
  merged.resolver.platforms = Array.from(
    new Set([...(merged.resolver.platforms || []), ...platforms])
  );

  // Inject aliases as extraNodeModules if present
  if (jjinppangConfig?.alias) {
    merged.resolver.extraNodeModules = {
      ...merged.resolver.extraNodeModules,
      ...jjinppangConfig.alias,
    };
  }

  // Attach jjinppang metadata to config
  (merged as any).jjinppang = {
    version: getJjinppangVersion(),
    enabled: true,
    ...jjinppangConfig,
  };

  return merged;
}
