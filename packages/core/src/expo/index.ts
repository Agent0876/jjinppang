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
    version: '0.1.0',
    enabled: true,
    ...jjinppangConfig,
  };

  return merged;
}
