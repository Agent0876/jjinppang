import fs from 'node:fs';
import path from 'node:path';
import imageSize from 'image-size';

/**
 * Reads dimensions for image files, scaling according to pixel density
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
