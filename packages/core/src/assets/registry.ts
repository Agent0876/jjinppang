import fs from 'node:fs';
import path from 'node:path';
import type { AssetFile, AssetMetadata } from '../types.js';

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

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses scale from filename: e.g. "image@2x.png" -> { name: "image", scale: 2, ext: "png" }
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

/**
 * Compute MD5 hash of a file's contents
 */
export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return Bun.hash(content).toString(16);
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
