import path from 'node:path';

export const DEFAULT_BABEL_PATTERNS = [
  // 1. Reanimated worklets and animation hooks
  /react-native-reanimated/,
  /['"]worklet['"]/,
  /useAnimated/,
  /useDerivedValue/,
  /createAnimatedComponent/,
  /useFrameCallback/,
  /runOn(JS|UI)/,

  // 2. Flow typing (Flow syntax is not stripped by Bun in .js files)
  /@flow/,
  /\bimport\s+type(?:of)?\b/,
  /\btype\s+[A-Z][\w$]*\s*=/,

  // 3. Hermes VM incompatible syntax (Hermes parser cannot execute these directly)
  /\bclass\s*(\{|\bextends\b|[\w$]+)/,
  /\basync\s+/,

  // 4. Styling macros & CSS-in-JS
  /\bnativewind\b/,
  /\bclassName\s*=/,
];

export const DEFAULT_BABEL_PATH_PATTERNS = [
  // Core React Native & platform forks (cross-platform path separators)
  /[\\/]node_modules[\\/]react-native[\\/]/,
  /[\\/]node_modules[\\/]react-native-macos[\\/]/,
  /[\\/]node_modules[\\/]react-native-windows[\\/]/,
  /[\\/]node_modules[\\/]@react-native[\\/]/,
  /[\\/]node_modules[\\/]@react-native-macos[\\/]/,
  /[\\/]node_modules[\\/]@react-native-windows[\\/]/,
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
