import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { BunPlugin } from 'bun';
import imageSize from 'image-size';
import type { AssetFile, AssetMetadata, Platform } from './types.js';

export const DEFAULT_ASSET_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'mp4',
  'mp3',
  'wav',
];

export interface AssetPluginOptions {
  projectRoot: string;
  platform: Platform;
  assetExtensions?: string[];
  onAssetCollected?: (asset: AssetMetadata) => void;
}

/**
 * Parses scale from filename: e.g. "image@2x.png" -> { name: "image", scale: 2 }
 */
export function parseAssetFilename(filename: string): { name: string; scale: number; ext: string } {
  const extWithDot = path.extname(filename);
  const ext = extWithDot.slice(1).toLowerCase();
  const nameWithoutExt = filename.slice(0, -extWithDot.length);

  const scaleMatch = nameWithoutExt.match(/^(.+?)@([\d.]+)x$/);
  if (scaleMatch) {
    return {
      name: scaleMatch[1],
      scale: parseFloat(scaleMatch[2]),
      ext,
    };
  }

  return {
    name: nameWithoutExt,
    scale: 1,
    ext,
  };
}

/**
 * Finds all scale variants in the same directory for a given base asset name
 */
export function findAssetScaleVariants(dir: string, baseName: string, ext: string): AssetFile[] {
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const variants: AssetFile[] = [];

  const pattern = new RegExp(
    `^${escapeRegExp(baseName)}(?:@([\\d.]+)x)?\\.${escapeRegExp(ext)}$`,
    'i'
  );

  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const scale = match[1] ? parseFloat(match[1]) : 1;
      variants.push({
        scale,
        path: path.join(dir, file),
      });
    }
  }

  variants.sort((a, b) => a.scale - b.scale);
  return variants;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compute MD5 hash of a file's contents
 */
export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Reads dimensions for image files
 */
export function getImageDimensions(
  filePath: string,
  scale: number
): { width?: number; height?: number } {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  if (!imageExts.includes(ext)) {
    return {};
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const dimensions = imageSize(buffer);
    if (dimensions.width && dimensions.height) {
      return {
        width: Math.round(dimensions.width / scale),
        height: Math.round(dimensions.height / scale),
      };
    }
  } catch {
    // If dimension extraction fails (e.g. exotic svg or corrupt file), return empty
  }

  return {};
}

/**
 * Builds React Native AssetRegistry module code for an asset
 */
export function generateAssetModuleCode(asset: AssetMetadata): string {
  return `var AssetRegistry = require("react-native/Libraries/Image/AssetRegistry");
module.exports = AssetRegistry.registerAsset({
  __packager_asset: true,
  httpServerLocation: ${JSON.stringify(asset.httpServerLocation)},
  width: ${asset.width ?? 'null'},
  height: ${asset.height ?? 'null'},
  scales: ${JSON.stringify(asset.scales)},
  hash: ${JSON.stringify(asset.hash)},
  name: ${JSON.stringify(asset.name)},
  type: ${JSON.stringify(asset.type)}
});
`;
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

/**
 * Maps scale to Android drawable folder name
 */
export function getAndroidDrawableFolder(scale: number): string {
  if (scale <= 0.75) return 'drawable-ldpi';
  if (scale <= 1) return 'drawable-mdpi';
  if (scale <= 1.5) return 'drawable-hdpi';
  if (scale <= 2) return 'drawable-xhdpi';
  if (scale <= 3) return 'drawable-xxhdpi';
  return 'drawable-xxxhdpi';
}

/**
 * Sanitizes asset name and relative path for Android resource identifiers
 * (matching Metro's getAndroidResourceIdentifier)
 */
export function getAndroidResourceIdentifier(projectRoot: string, filePath: string): string {
  const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  // Remove extension and scale
  const withoutExt = relativePath.replace(/(@[\d.]+x)?\.[a-zA-Z0-9]+$/, '');
  // Replace non-alphanumeric with underscore and lowercase
  return withoutExt.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Copies collected assets to destination folder (--assets-dest)
 * following iOS and Android platform conventions.
 */
export function copyAssetsToDestination(
  assets: AssetMetadata[],
  assetsDest: string,
  platform: Platform,
  projectRoot: string
): void {
  if (!fs.existsSync(assetsDest)) {
    fs.mkdirSync(assetsDest, { recursive: true });
  }

  const copiedFiles = new Set<string>();

  for (const asset of assets) {
    for (const variant of asset.files) {
      if (copiedFiles.has(variant.path)) continue;
      copiedFiles.add(variant.path);

      if (platform === 'ios') {
        // iOS: preserve httpServerLocation structure
        const subDir = asset.httpServerLocation.replace(/^\/?assets\/?/, '');
        const targetDir = path.join(assetsDest, subDir);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const scaleSuffix = variant.scale === 1 ? '' : `@${variant.scale}x`;
        const fileName = `${asset.name}${scaleSuffix}.${asset.type}`;
        const targetPath = path.join(targetDir, fileName);

        fs.copyFileSync(variant.path, targetPath);
      } else if (platform === 'android') {
        // Android: drawables for images, raw for fonts/others
        const isDrawable = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(asset.type.toLowerCase());

        const resourceId = getAndroidResourceIdentifier(projectRoot, variant.path);

        if (isDrawable) {
          const drawableFolder = getAndroidDrawableFolder(variant.scale);
          const targetDir = path.join(assetsDest, drawableFolder);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          const targetPath = path.join(targetDir, `${resourceId}.${asset.type}`);
          fs.copyFileSync(variant.path, targetPath);
        } else {
          const rawDir = path.join(assetsDest, 'raw');
          if (!fs.existsSync(rawDir)) {
            fs.mkdirSync(rawDir, { recursive: true });
          }

          const targetPath = path.join(rawDir, `${resourceId}.${asset.type}`);
          fs.copyFileSync(variant.path, targetPath);
        }
      }
    }
  }
}
