import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { BunPlugin } from 'bun';
import * as babelDefault from '@babel/core';
import fastFlowTransform from 'fast-flow-transform';
import {
  type BabelHybridPluginOptions,
  findBabelConfigFile,
  shouldTransformWithBabel,
} from './detector.js';
import { DEFAULT_BABEL_PATH_PATTERNS, WORKLET_PATTERNS, getLoaderForPath } from './patterns.js';

export { type BabelHybridPluginOptions } from './detector.js';

function getBabelInstance(projectRoot: string): typeof babelDefault {
  try {
    const req = createRequire(path.join(projectRoot, 'package.json'));
    return req('@babel/core');
  } catch {
    return babelDefault;
  }
}

/**
 * Creates Bun.build plugin for hybrid Babel transformation with persistent disk caching
 */
export function createBabelHybridPlugin(options: BabelHybridPluginOptions): BunPlugin {
  const babel = getBabelInstance(options.projectRoot);
  const configFile = findBabelConfigFile(options.projectRoot);
  const memoryCache = new Map<string, string>();

  // Determine persistent disk cache directory
  const nodeModulesDir = path.join(options.projectRoot, 'node_modules');
  const cacheBaseDir = fs.existsSync(nodeModulesDir)
    ? path.join(nodeModulesDir, '.cache', 'jjinppang', 'babel')
    : path.join(options.projectRoot, '.jjinppang', 'cache', 'babel');

  // Handle explicit cache reset
  if (options.resetCache && fs.existsSync(cacheBaseDir)) {
    try {
      fs.rmSync(cacheBaseDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  // Calculate configuration fingerprint (changes to babel.config or dev mode invalidate cache)
  let configFingerprint = 'no-config';
  if (configFile && fs.existsSync(configFile)) {
    try {
      configFingerprint = fs.readFileSync(configFile, 'utf8');
    } catch {
      // ignore
    }
  }
  const configHash = Bun.hash(`${configFingerprint}:${options.dev ? 'dev' : 'prod'}:v1`).toString(
    16
  );

  let cacheDirCreated = false;
  function ensureCacheDir() {
    if (!cacheDirCreated) {
      if (!fs.existsSync(cacheBaseDir)) {
        fs.mkdirSync(cacheBaseDir, { recursive: true });
      }
      cacheDirCreated = true;
    }
  }

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

        const fileHash = Bun.hash(`${filePath}:${code}`).toString(16);
        const cacheFileName = `${configHash}_${fileHash}.js`;

        // 1. Check L1 Memory Cache
        if (memoryCache.has(cacheFileName)) {
          return {
            contents: memoryCache.get(cacheFileName)!,
            loader: 'js',
          };
        }

        // 2. Check L2 Persistent Disk Cache
        const diskCachePath = path.join(cacheBaseDir, cacheFileName);
        const diskFile = Bun.file(diskCachePath);
        if (await diskFile.exists()) {
          try {
            const cachedCode = await diskFile.text();
            memoryCache.set(cacheFileName, cachedCode);
            let loader: any = getLoaderForPath(filePath);
            if (
              loader === 'js' &&
              cachedCode.includes('<') &&
              (cachedCode.includes('/>') || cachedCode.includes('</'))
            ) {
              loader = 'jsx';
            }
            return {
              contents: cachedCode,
              loader,
            };
          } catch {
            // Fall through to transform on read error
          }
        }

        // 3. Fast-path: Ultra-fast Rust Flow stripping for pure Flow files (130x+ faster than Babel)
        const needsWorkletOrCustom =
          (options.transformPatterns &&
            options.transformPatterns.some((p) =>
              typeof p === 'string'
                ? filePath.includes(p) || code.includes(p)
                : p.test(filePath) || p.test(code)
            )) ||
          WORKLET_PATTERNS.some((p) => p.test(filePath) || p.test(code));

        if (!needsWorkletOrCustom) {
          try {
            const stripped = await fastFlowTransform({
              filename: filePath,
              source: code,
              dialect: 'flow',
              format: 'pretty',
            });
            if (stripped && stripped.code) {
              const resCode = stripped.code;
              memoryCache.set(cacheFileName, resCode);
              ensureCacheDir();
              Bun.write(diskCachePath, resCode).catch(() => {});
              let loader: any = getLoaderForPath(filePath);
              if (
                loader === 'js' &&
                resCode.includes('<') &&
                (resCode.includes('/>') || resCode.includes('</'))
              ) {
                loader = 'jsx';
              }
              return {
                contents: resCode,
                loader,
              };
            }
          } catch {
            // Fall through to Babel transform if fast-flow-transform fails on edge-case syntax
          }
        }

        // 4. Perform Full Babel Transformation (Worklets, Custom Plugins, or Flow Fallback)
        try {
          const result = await babel.transformAsync(code, {
            filename: filePath,
            cwd: options.projectRoot,
            root: options.projectRoot,
            configFile: configFile ?? false,
            babelrc: false,
            sourceMaps: 'inline',
          });

          if (result && result.code) {
            memoryCache.set(cacheFileName, result.code);
            ensureCacheDir();
            // Asynchronously persist to disk cache
            Bun.write(diskCachePath, result.code).catch(() => {});
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
