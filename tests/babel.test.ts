import { describe, expect, it } from 'bun:test';
import {
  shouldTransformWithBabel,
  getLoaderForPath,
} from '../packages/bundler-plugin/src/babel-hybrid.js';

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
});
