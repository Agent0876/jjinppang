import fs from 'node:fs';
import path from 'node:path';
import type { ReactNativeBunBuildConfig } from '@react-native-bun-build/bundler-plugin';

export const CONFIG_FILE_NAMES = [
  'react-native-bun-build.config.js',
  'react-native-bun-build.config.ts',
  'react-native-bun-build.config.mjs',
  'react-native-bun-build.config.cjs',
  'bun-build.config.js',
  'bun-build.config.ts',
];

/**
 * Loads project-level react-native-bun-build configuration file
 */
export async function loadConfigFile(
  projectRoot: string,
  customConfigPath?: string
): Promise<ReactNativeBunBuildConfig> {
  let targetPath: string | undefined;

  if (customConfigPath) {
    targetPath = path.isAbsolute(customConfigPath)
      ? customConfigPath
      : path.resolve(projectRoot, customConfigPath);
  } else {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = path.join(projectRoot, name);
      if (fs.existsSync(candidate)) {
        targetPath = candidate;
        break;
      }
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    return {};
  }

  try {
    const imported = await import(targetPath);
    const config = imported.default || imported;
    return typeof config === 'function' ? await config() : config;
  } catch (error) {
    console.warn(
      `[react-native-bun-build] Warning: failed to load config from ${targetPath}:`,
      error
    );
    return {};
  }
}
