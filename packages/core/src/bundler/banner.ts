/**
 * Generates runtime prelude banner for React Native environments.
 * This runs before any module code in the bundle, ensuring global, __DEV__,
 * process.env, and Fast Refresh globals are defined.
 */
export function generateRuntimePrelude(dev: boolean): string {
  return `var __DEV__ = ${dev ? 'true' : 'false'};
var global = typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
if (typeof globalThis !== 'undefined') {
  globalThis.global = global;
}
global.global = global;
global.__DEV__ = __DEV__;
var process = global.process || {};
process.env = process.env || {};
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = __DEV__ ? 'development' : 'production';
}
global.process = process;
if (typeof globalThis.$RefreshReg$ === 'undefined') {
  globalThis.$RefreshReg$ = function() {};
}
if (typeof globalThis.$RefreshSig$ === 'undefined') {
  globalThis.$RefreshSig$ = function() { return function(type) { return type; }; };
}
`;
}

/**
 * Generates virtual entry script content that initializes Core and React Refresh before user code
 */
export function generateVirtualEntryContent(entryFile: string, dev: boolean): string {
  const refreshPreamble = dev
    ? `
// Fast Refresh setup
try {
  const RefreshRuntime = require('react-refresh/runtime');
  RefreshRuntime.injectIntoGlobalHook(globalThis);
  globalThis.$RefreshReg$ = function(type, id) {
    RefreshRuntime.register(type, id);
  };
  globalThis.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
} catch (e) {
  // Ignore if react-refresh is not installed
}
`
    : '';

  return `// Auto-generated entry wrapper by react-native-bun-build
import 'react-native/Libraries/Core/InitializeCore';
${refreshPreamble}
import ${JSON.stringify(entryFile)};
`;
}
