/**
 * Generates runtime prelude for React Native environments
 */
export function generateRuntimePrelude(dev: boolean): string {
  return `var __DEV__ = ${dev ? 'true' : 'false'};\nvar global = typeof global !== 'undefined' ? global : globalThis;\nglobal.__DEV__ = __DEV__;\n`;
}

/**
 * Generates virtual entry script content that initializes Core and React Refresh before user code
 */
export function generateVirtualEntryContent(entryFile: string, dev: boolean): string {
  const refreshPreamble = dev
    ? `
// Fast Refresh setup
try {
  var RefreshRuntime = require('react-refresh/runtime');
  RefreshRuntime.injectIntoGlobalHook(global);
  global.$RefreshReg$ = function(type, id) {
    RefreshRuntime.register(type, id);
  };
  global.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
} catch (e) {
  global.$RefreshReg$ = global.$RefreshReg$ || function() {};
  global.$RefreshSig$ = global.$RefreshSig$ || function() { return function(type) { return type; }; };
}
`
    : '';

  return `// Auto-generated entry wrapper by react-native-bun-build
var __DEV__ = ${dev ? 'true' : 'false'};
var global = typeof global !== 'undefined' ? global : globalThis;
global.__DEV__ = __DEV__;
${refreshPreamble}
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
