import type { BunPlugin } from 'bun';
import * as babel from '@babel/core';
import {
  type BabelHybridPluginOptions,
  findBabelConfigFile,
  shouldTransformWithBabel,
} from './detector.js';
import { DEFAULT_BABEL_PATH_PATTERNS } from './patterns.js';

export { type BabelHybridPluginOptions } from './detector.js';

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
        const isNodeModules =
          filePath.includes('/node_modules/') || filePath.includes('\\node_modules\\');
        const matchesDefaultPath = DEFAULT_BABEL_PATH_PATTERNS.some((p) => p.test(filePath));

        let code: string;
        try {
          code = await Bun.file(filePath).text();
        } catch {
          return undefined;
        }

        if (isNodeModules && !matchesDefaultPath) {
          const isExplicitlyIncluded =
            options.include?.some((pattern) =>
              typeof pattern === 'string' ? filePath.includes(pattern) : pattern.test(filePath)
            ) ?? false;
          if (!isExplicitlyIncluded) {
            // In other node_modules, only transform if code matches Babel patterns (Hermes, Flow, macros)
            if (!shouldTransformWithBabel(filePath, code, options)) {
              return undefined;
            }
          }
        }

        if (!shouldTransformWithBabel(filePath, code, options)) {
          return undefined; // Let Bun handle it natively!
        }

        const cacheKey = `${filePath}:${Bun.hash(code)}`;
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
            `[jjinppang] Warning: Babel transform failed for ${filePath}, falling back to Bun native transpiler. Error:`,
            err instanceof Error ? err.message : String(err)
          );
        }

        return undefined;
      });
    },
  };
}
