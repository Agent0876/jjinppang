import { describe, expect, it } from 'bun:test';
import { shouldTransformWithBabel, getLoaderForPath } from '../packages/core/src/babel/index.js';

describe('Babel Hybrid Plugin', () => {
  it('detects react-native-reanimated and worklet patterns', () => {
    const reanimatedFile = 'import Animated from "react-native-reanimated";';
    expect(
      shouldTransformWithBabel('/src/anim.js', reanimatedFile, {
        projectRoot: '/src',
      })
    ).toBe(true);

    const workletFile = 'function myWorklet() { "worklet"; return 42; }';
    expect(
      shouldTransformWithBabel('/src/comp.js', workletFile, {
        projectRoot: '/src',
      })
    ).toBe(true);

    const hookFile = 'const style = useAnimatedStyle(() => ({ opacity: 1 }));';
    expect(
      shouldTransformWithBabel('/src/hook.js', hookFile, {
        projectRoot: '/src',
      })
    ).toBe(true);
  });

  it('skips standard files without Babel-dependent code', () => {
    const regularFile = 'import React from "react"; export const App = () => null;';
    expect(
      shouldTransformWithBabel('/src/App.tsx', regularFile, {
        projectRoot: '/src',
      })
    ).toBe(false);
  });

  it('respects user transformPatterns, include and exclude options', () => {
    const customCode = 'import { customMacro } from "my-macro";';
    // Not matched by default
    expect(
      shouldTransformWithBabel('/src/custom.js', customCode, {
        projectRoot: '/src',
      })
    ).toBe(false);

    // Matched when transformPatterns includes it
    expect(
      shouldTransformWithBabel('/src/custom.js', customCode, {
        projectRoot: '/src',
        transformPatterns: [/my-macro/],
      })
    ).toBe(true);

    // Excluded when matching exclude pattern
    expect(
      shouldTransformWithBabel('/src/custom.js', customCode, {
        projectRoot: '/src',
        transformPatterns: [/my-macro/],
        exclude: ['/src/custom.js'],
      })
    ).toBe(false);
  });

  it('correctly maps file extensions to Bun loaders', () => {
    expect(getLoaderForPath('file.tsx')).toBe('tsx');
    expect(getLoaderForPath('file.ts')).toBe('ts');
    expect(getLoaderForPath('file.jsx')).toBe('jsx');
    expect(getLoaderForPath('file.js')).toBe('js');
    expect(getLoaderForPath('file.json')).toBe('json');
  });

  it('creates and uses persistent disk cache for Babel transforms', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { createBabelHybridPlugin } = await import('../packages/core/src/babel/index.js');

    const tempTestDir = path.resolve('tests/.temp-babel-cache-test');
    if (!fs.existsSync(tempTestDir)) fs.mkdirSync(tempTestDir, { recursive: true });

    const cacheDir = path.join(tempTestDir, '.jjinppang/cache/babel');

    // 1. Initial build with cache enabled
    const plugin = createBabelHybridPlugin({
      projectRoot: tempTestDir,
      resetCache: true,
    });

    const mockBuild: any = {
      onLoad: (_opts: any, callback: any) => {
        mockBuild._callback = callback;
      },
    };
    plugin.setup(mockBuild);

    const testFile = path.join(tempTestDir, 'workletTest.js');
    fs.writeFileSync(testFile, 'function testWorklet() { "worklet"; return 123; }', 'utf8');

    // Run transform
    const result1 = await mockBuild._callback({ path: testFile });
    expect(result1).toBeDefined();
    expect(result1.loader).toBe('js');

    // Wait a brief tick for async write
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify cache folder was created and contains cached file
    expect(fs.existsSync(cacheDir)).toBe(true);
    const cachedFiles = fs.readdirSync(cacheDir);
    expect(cachedFiles.length).toBeGreaterThan(0);

    // 2. Second build should hit persistent disk cache
    const plugin2 = createBabelHybridPlugin({
      projectRoot: tempTestDir,
      resetCache: false,
    });
    const mockBuild2: any = {
      onLoad: (_opts: any, callback: any) => {
        mockBuild2._callback = callback;
      },
    };
    plugin2.setup(mockBuild2);

    const result2 = await mockBuild2._callback({ path: testFile });
    expect(result2).toBeDefined();
    expect(result2.contents).toBe(result1.contents);

    // 3. Reset cache removes disk cache
    createBabelHybridPlugin({
      projectRoot: tempTestDir,
      resetCache: true,
    });
    expect(fs.existsSync(cacheDir)).toBe(false);

    // Cleanup
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  });
});
