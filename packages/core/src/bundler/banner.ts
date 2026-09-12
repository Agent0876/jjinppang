/**
 * Generates runtime prelude banner for React Native environments.
 * This runs before any module code in the bundle, ensuring global, __DEV__,
 * process.env, and Fast Refresh globals are defined.
 */
export function generateRuntimePrelude(dev: boolean): string {
  if (!dev) {
    return `var __DEV__ = false;
var global = typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
if (typeof globalThis !== 'undefined') {
  globalThis.global = global;
}
global.global = global;
global.__DEV__ = false;
var process = global.process || {};
process.env = process.env || {};
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}
global.process = process;
`;
  }

  return `var __DEV__ = true;
var global = typeof global !== 'undefined' ? global : typeof globalThis !== 'undefined' ? globalThis : this;
if (typeof globalThis !== 'undefined') {
  globalThis.global = global;
}
global.global = global;
global.__DEV__ = __DEV__;
var process = global.process || {};
process.env = process.env || {};
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
global.process = process;
if (typeof globalThis.$RefreshReg$ === 'undefined') {
  globalThis.$RefreshReg$ = function() {};
}
if (typeof globalThis.$RefreshSig$ === 'undefined') {
  globalThis.$RefreshSig$ = function() { return function(type) { return type; }; };
}
// Fallback console methods if not defined
if (typeof global.console === 'undefined') {
  global.console = {};
}
if (typeof global.console.createTask === 'undefined') {
  global.console.createTask = function() { return null; };
}
// Standard React Native ErrorUtils polyfill
var __rnBunInGuard = 0;
var __rnBunGlobalHandler = function(e, isFatal) {
  var msg = e && e.message ? e.message : String(e);
  var stack = e && e.stack ? e.stack : '';
  if (typeof console !== 'undefined' && console.error) {
    console.error('[BunRN] ' + (isFatal ? 'Fatal' : 'Uncaught') + ' error:', msg, stack);
  }
  try {
    var __debugUrl = (typeof global !== 'undefined' && global.__jjinppang_dev_url) || 'http://localhost:8081';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', __debugUrl + '/debug-errors', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ message: msg, stack: stack, isFatal: isFatal }));
  } catch(x) {}
};
if (typeof global.ErrorUtils === 'undefined') {
  global.ErrorUtils = {
    setGlobalHandler: function(fn) { __rnBunGlobalHandler = fn; },
    getGlobalHandler: function() { return __rnBunGlobalHandler; },
    reportError: function(e) { __rnBunGlobalHandler(e, false); },
    reportFatalError: function(e) { __rnBunGlobalHandler(e, true); },
    applyWithGuard: function(fn, context, args) {
      try {
        __rnBunInGuard++;
        return fn.apply(context, args);
      } catch (e) {
        this.reportError(e);
      } finally {
        __rnBunInGuard--;
      }
      return null;
    },
    applyWithGuardIfNeeded: function(fn, context, args) {
      if (this.inGuard()) {
        return fn.apply(context, args);
      }
      return this.applyWithGuard(fn, context, args);
    },
    inGuard: function() {
      return !!__rnBunInGuard;
    },
    guard: function(fn, name, context) {
      if (typeof fn !== 'function') return fn;
      var self = this;
      return function() {
        return self.applyWithGuard(fn, context || this, arguments);
      };
    },
  };
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
  globalThis.__ReactRefresh = RefreshRuntime;
  if (typeof global !== 'undefined') {
    global.__ReactRefresh = RefreshRuntime;
  }
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
