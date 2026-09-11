import fs from 'node:fs';
import path from 'node:path';
import type { AssetMetadata, BundlerOptions } from '../types.js';
import { createResolverPlugin } from '../resolver/index.js';
import { createAssetPlugin, copyAssetsToDestination } from '../assets/index.js';
import { createBabelHybridPlugin } from '../babel/index.js';
import { compileWithHermes } from '../hermes/index.js';
import { generateRuntimePrelude, generateVirtualEntryContent } from './banner.js';

export interface BundleResult {
  bundleOutput: string;
  sourcemapOutput?: string;
  assetsCount: number;
  hermesCompiled: boolean;
  durationMs: number;
  bundleSizeBytes: number;
}

/**
 * Main bundling function using Bun.build()
 */
export async function bundle(options: BundlerOptions): Promise<BundleResult> {
  const startTime = performance.now();

  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const entryFile = path.resolve(projectRoot, options.entryFile);
  const bundleOutput = path.resolve(projectRoot, options.bundleOutput);
  const assetsDest = options.assetsDest ? path.resolve(projectRoot, options.assetsDest) : undefined;
  const sourcemapOutput = options.sourcemapOutput
    ? path.resolve(projectRoot, options.sourcemapOutput)
    : undefined;

  // Ensure output directory exists
  const outputDir = path.dirname(bundleOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Temporary virtual entry file to prepend InitializeCore and React Refresh
  const tempEntryDir = path.join(projectRoot, '.bun-rn-temp');
  if (!fs.existsSync(tempEntryDir)) {
    fs.mkdirSync(tempEntryDir, { recursive: true });
  }
  const virtualEntryPath = path.join(
    tempEntryDir,
    `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.js`
  );

  const virtualEntryContent = generateVirtualEntryContent(entryFile, options.dev);
  fs.writeFileSync(virtualEntryPath, virtualEntryContent, 'utf8');

  // Track collected assets
  const collectedAssets: AssetMetadata[] = [];
  const assetPlugin = createAssetPlugin(
    {
      projectRoot,
      platform: options.platform,
      assetExtensions: options.assetExtensions,
    },
    collectedAssets
  );

  const babelPlugin = createBabelHybridPlugin({
    projectRoot,
    ...options.babel,
  });

  const resolverPlugin = createResolverPlugin({
    platform: options.platform,
    projectRoot,
    alias: options.alias,
  });

  let buildResult;
  try {
    buildResult = await Bun.build({
      entrypoints: [virtualEntryPath],
      target: 'browser',
      format: 'iife',
      banner: generateRuntimePrelude(options.dev),
      minify: options.minify ?? !options.dev,
      sourcemap: sourcemapOutput ? 'external' : 'none',
      define: {
        __DEV__: JSON.stringify(options.dev),
        'process.env.NODE_ENV': JSON.stringify(options.dev ? 'development' : 'production'),
      },
      plugins: [resolverPlugin, assetPlugin, babelPlugin],
    });
  } finally {
    // Clean up temporary entry
    try {
      if (fs.existsSync(virtualEntryPath)) {
        fs.unlinkSync(virtualEntryPath);
      }
      if (fs.existsSync(tempEntryDir) && fs.readdirSync(tempEntryDir).length === 0) {
        fs.rmdirSync(tempEntryDir);
      }
    } catch {
      // ignore
    }
  }

  if (!buildResult.success) {
    const errors = buildResult.logs
      .map((log) => `${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
    throw new Error(`[react-native-bun-build] Bun build failed:\n${errors}`);
  }

  // Write bundle and sourcemap outputs
  const jsOutput = buildResult.outputs.find((out) => out.kind === 'entry-point');
  const sourcemapArtifact = buildResult.outputs.find((out) => out.kind === 'sourcemap');

  if (!jsOutput) {
    throw new Error(`[react-native-bun-build] No entrypoint output produced by Bun.build`);
  }

  // Virtual entry already sets __DEV__, global, and InitializeCore — no additional prelude needed
  const bundleText = await jsOutput.text();

  fs.writeFileSync(bundleOutput, bundleText, options.bundleEncoding ?? 'utf8');

  if (sourcemapOutput && sourcemapArtifact) {
    const sourcemapDir = path.dirname(sourcemapOutput);
    if (!fs.existsSync(sourcemapDir)) {
      fs.mkdirSync(sourcemapDir, { recursive: true });
    }
    const sourcemapText = await sourcemapArtifact.text();
    fs.writeFileSync(sourcemapOutput, sourcemapText, 'utf8');
  }

  // Copy assets if requested
  if (assetsDest && collectedAssets.length > 0) {
    copyAssetsToDestination(collectedAssets, assetsDest, options.platform, projectRoot);
  }

  // Hermes Bytecode Compilation
  let hermesCompiled = false;
  const shouldCompileHermes = !options.dev && options.hermes?.enabled !== false;

  if (shouldCompileHermes) {
    hermesCompiled = compileWithHermes({
      projectRoot,
      bundleOutput,
      sourcemapOutput,
      options: options.hermes,
    });
  }

  const durationMs = Math.round(performance.now() - startTime);
  const bundleSizeBytes = fs.statSync(bundleOutput).size;

  return {
    bundleOutput,
    sourcemapOutput,
    assetsCount: collectedAssets.length,
    hermesCompiled,
    durationMs,
    bundleSizeBytes,
  };
}
