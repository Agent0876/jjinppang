import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { bundle } from '../packages/core/src/index.js';

const TEST_DIR = path.join(__dirname, '.temp-compatibility-test');

describe('Ecosystem Compatibility Matrix & Module Interop Pipeline', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Mock minimal React Native
    const rnDir = path.join(TEST_DIR, 'node_modules', 'react-native');
    fs.mkdirSync(path.join(rnDir, 'Libraries', 'Core'), { recursive: true });
    fs.writeFileSync(
      path.join(rnDir, 'package.json'),
      JSON.stringify({ name: 'react-native', main: 'index.js' })
    );
    fs.writeFileSync(path.join(rnDir, 'index.js'), 'module.exports = { Platform: { OS: "ios" } };');
    fs.writeFileSync(
      path.join(rnDir, 'Libraries', 'Core', 'InitializeCore.js'),
      '/* InitializeCore */'
    );

    // 1. Circular dependencies test files: moduleA <-> moduleB
    fs.writeFileSync(
      path.join(TEST_DIR, 'circularA.js'),
      `import { getB } from './circularB.js';
export const nameA = 'ModuleA';
export function getA() { return nameA; }
export function callBFromA() { return getB(); }
`
    );
    fs.writeFileSync(
      path.join(TEST_DIR, 'circularB.js'),
      `import { nameA, getA } from './circularA.js';
export const nameB = 'ModuleB';
export function getB() { return nameB; }
export function callAFromB() { return getA(); }
`
    );

    // 2. CJS / ESM Interop module
    fs.writeFileSync(
      path.join(TEST_DIR, 'legacy-cjs.js'),
      `module.exports = {
  add: function(a, b) { return a + b; },
  multiply: function(a, b) { return a * b; },
  version: '1.0.0'
};
module.exports.default = module.exports;
`
    );

    // 3. Zustand-style minimal store pattern
    fs.writeFileSync(
      path.join(TEST_DIR, 'store.ts'),
      `export interface State {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export function createStore(initial = 0) {
  let state = { count: initial };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (fn: (s: typeof state) => typeof state) => {
      state = fn(state);
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
`
    );

    // 4. Barrel re-export pattern
    fs.writeFileSync(
      path.join(TEST_DIR, 'barrel.ts'),
      `export * as MathUtils from './legacy-cjs.js';
export * from './circularA.js';
export * from './circularB.js';
export * from './store.js';
`
    );

    // 5. Main entry integrating all ecosystem patterns
    fs.writeFileSync(
      path.join(TEST_DIR, 'index.ts'),
      `import { MathUtils, callBFromA, callAFromB, createStore } from './barrel';
import { Platform } from 'react-native';

const store = createStore(10);
store.setState((s) => ({ count: s.count + 5 }));

globalThis.__COMPAT_RESULT__ = {
  mathAdd: MathUtils.add(10, 20),
  mathMult: MathUtils.multiply(3, 7),
  circularAB: callBFromA(),
  circularBA: callAFromB(),
  storeCount: store.getState().count,
  platform: Platform.OS,
};
`
    );
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('bundles circular dependencies, CJS/ESM interop, and store closures without compilation error', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'compat.jsbundle');

    const result = await bundle({
      projectRoot: TEST_DIR,
      entryFile: 'index.ts',
      platform: 'ios',
      dev: false,
      minify: false,
      bundleOutput,
      hermes: { enabled: false }, // test pure JS output execution
    });

    expect(result.durationMs).toBeGreaterThan(0);
    expect(fs.existsSync(bundleOutput)).toBe(true);

    const bundleCode = fs.readFileSync(bundleOutput, 'utf8');
    expect(bundleCode).toContain('ModuleA');
    expect(bundleCode).toContain('ModuleB');
    expect(bundleCode).toContain('MathUtils');
  });

  it('evaluates bundled code in a clean JavaScript VM context and asserts runtime correctness', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'compat.jsbundle');
    const bundleCode = fs.readFileSync(bundleOutput, 'utf8');

    // Create a mock React Native global environment
    const sandbox: Record<string, any> = {
      console,
      setTimeout,
      clearTimeout,
    };
    sandbox.globalThis = sandbox;
    sandbox.global = sandbox;
    sandbox.window = sandbox;

    const context = vm.createContext(sandbox);
    vm.runInContext(bundleCode, context);

    const res = sandbox.__COMPAT_RESULT__;
    expect(res).toBeDefined();
    expect(res.mathAdd).toBe(30);
    expect(res.mathMult).toBe(21);
    expect(res.circularAB).toBe('ModuleB');
    expect(res.circularBA).toBe('ModuleA');
    expect(res.storeCount).toBe(15);
    expect(res.platform).toBe('ios');
  });
});
