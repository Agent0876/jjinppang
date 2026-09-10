import type { ReactNativeBunBuildConfig } from '../types.js';

/**
 * Type-safe helper to define configuration for react-native-bun-build
 * @example
 * ```ts
 * import { defineConfig } from '@react-native-bun-build/core';
 *
 * export default defineConfig({
 *   hermes: { enabled: true },
 *   assetExtensions: ['png', 'jpg'],
 * });
 * ```
 */
export function defineConfig(config: ReactNativeBunBuildConfig): ReactNativeBunBuildConfig {
  return config;
}
