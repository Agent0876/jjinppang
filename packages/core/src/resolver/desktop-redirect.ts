import type { Platform } from '../types.js';
import { findNodeModulesPackage } from './node-modules.js';

/**
 * Handles automatic core module redirection for React Native desktop targets.
 * On macOS: react-native -> react-native-macos (if installed)
 * On Windows: react-native -> react-native-windows (if installed)
 */
export function redirectDesktopSpecifier(
  specifier: string,
  fromDir: string,
  projectRoot: string,
  platform: Platform
): string {
  if (
    platform === 'macos' &&
    (specifier === 'react-native' || specifier.startsWith('react-native/'))
  ) {
    const hasMacos = Boolean(
      findNodeModulesPackage(fromDir, 'react-native-macos') ||
      findNodeModulesPackage(projectRoot, 'react-native-macos')
    );
    if (hasMacos) {
      return specifier.replace(/^react-native/, 'react-native-macos');
    }
  } else if (
    platform === 'windows' &&
    (specifier === 'react-native' || specifier.startsWith('react-native/'))
  ) {
    const hasWindows = Boolean(
      findNodeModulesPackage(fromDir, 'react-native-windows') ||
      findNodeModulesPackage(projectRoot, 'react-native-windows')
    );
    if (hasWindows) {
      return specifier.replace(/^react-native/, 'react-native-windows');
    }
  }

  return specifier;
}
