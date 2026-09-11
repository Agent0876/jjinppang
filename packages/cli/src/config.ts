import fs from 'node:fs';
import path from 'node:path';
import type { JjinppangConfig } from '@jjinppang/core';

export const CONFIG_FILE_NAMES = [
  'jjinppang.config.js',
  'jjinppang.config.ts',
  'jjinppang.config.mjs',
  'jjinppang.config.cjs',
  // Backward compatibility candidates:
  'react-native-bun-build.config.js',
  'react-native-bun-build.config.ts',
  'react-native-bun-build.config.mjs',
  'react-native-bun-build.config.cjs',
  'bun-build.config.js',
  'bun-build.config.ts',
];

/**
 * Loads project-level jjinppang configuration file
 */
export async function loadConfigFile(
  projectRoot: string,
  customConfigPath?: string
): Promise<JjinppangConfig> {
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

  const baseName = path.basename(targetPath);
  if (baseName.includes('react-native-bun-build') || baseName.includes('bun-build')) {
    console.warn(
      `[jjinppang] ⚠️ Deprecation Notice: "${baseName}" is deprecated. Please rename your configuration file to "jjinppang.config.js".`
    );
  }

  try {
    const imported = await import(targetPath);
    const config = imported.default || imported;
    return typeof config === 'function' ? await config() : config;
  } catch (error) {
    console.warn(`[jjinppang] Warning: failed to load config from ${targetPath}:`, error);
    return {};
  }
}
