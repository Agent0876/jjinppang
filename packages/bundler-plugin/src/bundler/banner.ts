/**
 * Generates runtime prelude for React Native environments
 */
export function generateRuntimePrelude(dev: boolean): string {
  return `var __DEV__ = ${dev ? 'true' : 'false'};\nvar global = typeof global !== 'undefined' ? global : globalThis;\nglobal.__DEV__ = __DEV__;\n`;
}

/**
 * Generates virtual entry script content that initializes Core before user code
 */
export function generateVirtualEntryContent(entryFile: string, dev: boolean): string {
  return `// Auto-generated entry wrapper by react-native-bun-build
var __DEV__ = ${dev ? 'true' : 'false'};
var global = typeof global !== 'undefined' ? global : globalThis;
global.__DEV__ = __DEV__;

try {
  require('react-native/Libraries/Core/InitializeCore');
} catch (e) {
  try {
    require('react-native/setup-env');
  } catch (e2) {}
}

require(${JSON.stringify(entryFile)});
`;
}
