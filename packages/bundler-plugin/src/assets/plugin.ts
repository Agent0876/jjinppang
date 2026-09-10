import path from 'node:path';
import type { BunPlugin } from 'bun';
import type { AssetMetadata, Platform } from '../types.js';
import { getImageDimensions } from './dimensions.js';
import {
  DEFAULT_ASSET_EXTENSIONS,
  computeFileHash,
  findAssetScaleVariants,
  generateAssetModuleCode,
  parseAssetFilename,
} from './registry.js';

export interface AssetPluginOptions {
  projectRoot: string;
  platform: Platform;
  assetExtensions?: string[];
  onAssetCollected?: (asset: AssetMetadata) => void;
}

/**
 * Bun.build plugin to intercept asset imports and return AssetRegistry module
 */
export function createAssetPlugin(
  options: AssetPluginOptions,
  collectedAssets: AssetMetadata[] = []
): BunPlugin {
  const extensions = options.assetExtensions ?? DEFAULT_ASSET_EXTENSIONS;
  const filterRegex = new RegExp(`\\.(${extensions.join('|')})$`, 'i');

  return {
    name: 'react-native-asset-loader',
    setup(build) {
      build.onLoad({ filter: filterRegex }, (args) => {
        const filePath = args.path;
        const dir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const { name: baseName, scale, ext } = parseAssetFilename(fileName);

        // Find all scale variants in the directory
        const variants = findAssetScaleVariants(dir, baseName, ext);
        if (variants.length === 0) {
          variants.push({ scale, path: filePath });
        }

        const scales = variants.map((v) => v.scale);
        const hash = computeFileHash(filePath);
        const dimensions = getImageDimensions(filePath, scale);

        // Calculate httpServerLocation relative to projectRoot
        const relativeDir = path.relative(options.projectRoot, dir).replace(/\\/g, '/');
        const httpServerLocation = relativeDir.startsWith('..')
          ? '/assets'
          : `/assets/${relativeDir}`.replace(/\/+/g, '/');

        const metadata: AssetMetadata = {
          __packager_asset: true,
          httpServerLocation,
          width: dimensions.width ?? 0,
          height: dimensions.height ?? 0,
          scales,
          hash,
          name: baseName,
          type: ext,
          files: variants,
        };

        collectedAssets.push(metadata);
        if (options.onAssetCollected) {
          options.onAssetCollected(metadata);
        }

        const code = generateAssetModuleCode(metadata);
        return {
          contents: code,
          loader: 'js',
        };
      });
    },
  };
}
