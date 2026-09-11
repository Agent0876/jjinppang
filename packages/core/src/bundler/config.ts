import type { JjinppangConfig } from '../types.js';

/**
 * Type-safe helper to define configuration for 찐빵 (jjinppang)
 * @example
 * ```ts
 * import { defineConfig } from 'jjinppang';
 *
 * export default defineConfig({
 *   hermes: { enabled: true },
 *   assetExtensions: ['png', 'jpg'],
 * });
 * ```
 */
export function defineConfig(config: JjinppangConfig): JjinppangConfig {
  return config;
}
