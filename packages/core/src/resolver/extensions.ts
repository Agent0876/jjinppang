import type { Platform } from '../types.js';

/**
 * Generates platform-specific extension priorities for a given platform.
 * macOS cascades: .macos.* -> .ios.* -> .native.* -> standard
 * Windows cascades: .windows.* -> .native.* -> standard
 */
export function createPlatformExtensions(platform: Platform): string[] {
  const exts: string[] = [
    `.${platform}.tsx`,
    `.${platform}.ts`,
    `.${platform}.jsx`,
    `.${platform}.js`,
  ];

  if (platform === 'macos') {
    exts.push('.ios.tsx', '.ios.ts', '.ios.jsx', '.ios.js');
  }

  exts.push(
    '.native.tsx',
    '.native.ts',
    '.native.jsx',
    '.native.js',
    '.tsx',
    '.ts',
    '.jsx',
    '.js',
    '.json'
  );

  return exts;
}
