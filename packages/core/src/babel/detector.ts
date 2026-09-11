import fs from 'node:fs';
import path from 'node:path';
import type { BabelHybridOptions } from '../types.js';
import { DEFAULT_BABEL_PATH_PATTERNS, DEFAULT_BABEL_PATTERNS } from './patterns.js';

export interface BabelHybridPluginOptions extends BabelHybridOptions {
  projectRoot: string;
  resetCache?: boolean;
  dev?: boolean;
}

/**
 * Checks whether a given file and its source code should be transformed with Babel
 */
export function shouldTransformWithBabel(
  filePath: string,
  code: string,
  options: BabelHybridPluginOptions
): boolean {
  // 1. Check user exclude
  if (options.exclude) {
    for (const pattern of options.exclude) {
      if (typeof pattern === 'string' && filePath.includes(pattern)) {
        return false;
      }
      if (pattern instanceof RegExp && pattern.test(filePath)) {
        return false;
      }
    }
  }

  // 1.5. Exclude pre-compiled libraries from redundant Babel transformation
  // These packages are already pre-compiled and running Babel worklet plugins on them causes massive code bloat.
  if (
    /[\\/]node_modules[\\/](react-native-reanimated|react-native-worklets|react-native-worklets-core)[\\/]/.test(
      filePath
    )
  ) {
    return false;
  }

  // 2. Check user include
  if (options.include) {
    for (const pattern of options.include) {
      if (typeof pattern === 'string' && filePath.includes(pattern)) {
        return true;
      }
      if (pattern instanceof RegExp && pattern.test(filePath)) {
        return true;
      }
    }
  }

  // 3. Check default path patterns (react-native and @react-native use Flow)
  for (const pathPattern of DEFAULT_BABEL_PATH_PATTERNS) {
    if (pathPattern.test(filePath)) {
      return true;
    }
  }

  // 4. Check transformPatterns (user patterns + default patterns like reanimated/flow)
  const patterns = [...(options.transformPatterns ?? []), ...DEFAULT_BABEL_PATTERNS];

  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      if (filePath.includes(pattern) || code.includes(pattern)) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(filePath) || pattern.test(code)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Locate Babel configuration in project root
 */
export function findBabelConfigFile(projectRoot: string): string | undefined {
  const candidates = [
    'babel.config.js',
    'babel.config.cjs',
    'babel.config.mjs',
    'babel.config.json',
    '.babelrc',
    '.babelrc.js',
    '.babelrc.json',
  ];

  for (const candidate of candidates) {
    const fullPath = path.join(projectRoot, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return undefined;
}
