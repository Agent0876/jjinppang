import path from 'node:path';

export const DEFAULT_BABEL_PATTERNS = [
  /react-native-reanimated/,
  /['"]worklet['"]/,
  /useAnimatedStyle/,
  /useAnimatedProps/,
  /useDerivedValue/,
  /createAnimatedComponent/,
  /@flow/,
  /import\s+typeof/,
];

export const DEFAULT_BABEL_PATH_PATTERNS = [
  /\/node_modules\/react-native\//,
  /\/node_modules\/react-native-macos\//,
  /\/node_modules\/react-native-windows\//,
  /\/node_modules\/@react-native\//,
  /\/node_modules\/@react-native-macos\//,
  /\/node_modules\/@react-native-windows\//,
];

/**
 * Determine Bun loader for a given file extension
 */
export function getLoaderForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.tsx':
      return 'tsx';
    case '.ts':
      return 'ts';
    case '.jsx':
      return 'jsx';
    case '.json':
      return 'json';
    default:
      return 'js';
  }
}
