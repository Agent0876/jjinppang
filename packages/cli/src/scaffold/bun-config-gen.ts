import fs from 'node:fs';
import path from 'node:path';
import type { PackageJson } from './pkg-updater.js';

export interface GenerateBunConfigResult {
  status: 'created' | 'skipped';
  file: string;
}

/**
 * Generates jjinppang.config.js with auto-detected library patterns
 */
export function generateJjinppangConfig(
  projectDir: string,
  pkgJson: PackageJson,
  dryRun = false,
  force = false
): GenerateBunConfigResult {
  const configFile = path.join(projectDir, 'jjinppang.config.js');
  if (fs.existsSync(configFile) && !force) {
    return { status: 'skipped', file: configFile };
  }

  const allDeps = {
    ...pkgJson?.dependencies,
    ...pkgJson?.devDependencies,
  };

  const hasReanimated = 'react-native-reanimated' in allDeps;
  const hasWorklets = 'react-native-worklets-core' in allDeps;

  const transformPatterns: string[] = [];
  if (hasReanimated) transformPatterns.push('/react-native-reanimated/');
  if (hasWorklets) transformPatterns.push('/react-native-worklets-core/');

  const transformPatternsCode =
    transformPatterns.length > 0
      ? `[\n      ${transformPatterns.join(',\n      ')},\n    ]`
      : `[\n      // e.g. /react-native-reanimated/\n    ]`;

  const content = `/**
 * 찐빵 (jjinppang) Configuration
 * https://github.com/shinseungmin/jjinppang
 */
module.exports = {
  // Custom asset extensions to process
  assetExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf'],

  // Custom module aliases
  alias: {
    // '@components': './src/components',
  },

  // Hybrid Babel configuration
  babel: {
    // Patterns that require Babel AST transform (worklets, macros, etc.)
    transformPatterns: ${transformPatternsCode},
    include: [],
    exclude: [],
  },

  // Hermes bytecode compilation settings
  hermes: {
    enabled: true, // Default: true in release builds (--dev false)
    flags: ['-O'],
  },

  // Override minification
  minify: undefined,
};
`;

  if (!dryRun) {
    fs.writeFileSync(configFile, content, 'utf8');
  }

  return { status: 'created', file: configFile };
}

/**
 * Backward compatibility alias for generateJjinppangConfig
 */
export const generateBunBuildConfig = generateJjinppangConfig;
