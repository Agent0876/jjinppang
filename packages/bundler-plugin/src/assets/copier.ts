import fs from 'node:fs';
import path from 'node:path';
import type { AssetMetadata, Platform } from '../types.js';
import { getAndroidDrawableFolder, getAndroidResourceIdentifier } from './android-mapper.js';

/**
 * Copies collected assets to destination folder (--assets-dest)
 * following iOS, Android, macOS, and Windows platform conventions.
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

      if (platform === 'ios' || platform === 'macos' || platform === 'windows') {
        // iOS / macOS / Windows: preserve httpServerLocation structure
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
