import fs from 'node:fs';
import path from 'node:path';
import type { BunPlugin } from 'bun';
import * as babel from '@babel/core';
import type { BabelHybridOptions } from './types.js';

export interface BabelHybridPluginOptions extends BabelHybridOptions {
  projectRoot: string;
}

export const DEFAULT_BABEL_PATTERNS = [
  /react-native-reanimated/,
  /['"]worklet['"]/,
  /useAnimatedStyle/,
  /useAnimatedProps/,
  /useDerivedValue/,
  /createAnimatedComponent/,
  /@flow/,
  /import\s+typeof/,
];

export const DEFAULT_BABEL_PATH_PATTERNS = [
  /\/node_modules\/react-native\//,
  /\/node_modules\/@react-native\//,
];

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

/**
 * Determine Bun loader for a given file extension
 */
export function getLoaderForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.tsx':
      return 'tsx';
    case '.ts':
      return 'ts';
    case '.jsx':
      return 'jsx';
    case '.json':
      return 'json';
    default:
      return 'js';
  }
}

/**
 * Creates Bun.build plugin for hybrid Babel transformation
 */
export function createBabelHybridPlugin(options: BabelHybridPluginOptions): BunPlugin {
  const configFile = findBabelConfigFile(options.projectRoot);
  const cache = new Map<string, string>();

  return {
    name: 'react-native-babel-hybrid',
    setup(build) {
      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
        const filePath = args.path;

        // Skip other node_modules unless matched by path pattern or explicitly included
        const isNodeModules = filePath.includes('/node_modules/');
        const matchesDefaultPath = DEFAULT_BABEL_PATH_PATTERNS.some((p) => p.test(filePath));

        if (isNodeModules && !matchesDefaultPath) {
          const isExplicitlyIncluded =
            options.include?.some((pattern) =>
              typeof pattern === 'string' ? filePath.includes(pattern) : pattern.test(filePath)
            ) ?? false;
          if (!isExplicitlyIncluded && !filePath.includes('react-native-reanimated')) {
            return undefined;
          }
        }

        let code: string;
        try {
          code = await Bun.file(filePath).text();
        } catch {
          return undefined;
        }

        if (!shouldTransformWithBabel(filePath, code, options)) {
          return undefined; // Let Bun handle it natively!
        }

        const cacheKey = `${filePath}:${code.length}`;
        if (cache.has(cacheKey)) {
          return {
            contents: cache.get(cacheKey)!,
            loader: 'js',
          };
        }

        try {
          const result = await babel.transformAsync(code, {
            filename: filePath,
            configFile: configFile ?? false,
            babelrc: false,
            sourceMaps: 'inline',
            presets: configFile ? undefined : ['@babel/preset-typescript'],
          });

          if (result && result.code) {
            cache.set(cacheKey, result.code);
            return {
              contents: result.code,
              loader: 'js',
            };
          }
        } catch (err: unknown) {
          console.warn(
            `[react-native-bun-build] Warning: Babel transform failed for ${filePath}, falling back to Bun native transpiler. Error:`,
            err instanceof Error ? err.message : String(err)
          );
        }

        return undefined;
      });
    },
  };
}
