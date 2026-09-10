import path from 'node:path';

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
