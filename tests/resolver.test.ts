import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveFileWithPlatformExtensions,
  resolveDirectory,
  resolveSpecifier,
} from '../packages/bundler-plugin/src/resolver.js';

const TEST_DIR = path.join(__dirname, '.temp-resolver-test');

describe('React Native Platform Resolver', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // File structure:
    // Component.ios.tsx
    // Component.android.tsx
    // Component.native.tsx
    // Component.tsx
    // Fallback.native.js
    // Fallback.js
    // OnlyDefault.js
    // SubDir/index.ios.js
    // SubDir/index.js
    // PkgWithRNField/package.json (react-native: src/custom.js)
    // PkgWithRNField/src/custom.ios.js
    // PkgWithRNField/src/custom.js
    fs.writeFileSync(path.join(TEST_DIR, 'Component.ios.tsx'), 'export default "ios";');
    fs.writeFileSync(path.join(TEST_DIR, 'Component.android.tsx'), 'export default "android";');
    fs.writeFileSync(path.join(TEST_DIR, 'Component.macos.tsx'), 'export default "macos";');
    fs.writeFileSync(path.join(TEST_DIR, 'Component.windows.tsx'), 'export default "windows";');
    fs.writeFileSync(path.join(TEST_DIR, 'Component.native.tsx'), 'export default "native";');
    fs.writeFileSync(path.join(TEST_DIR, 'Component.tsx'), 'export default "default";');

    fs.writeFileSync(path.join(TEST_DIR, 'AppleOnly.ios.tsx'), 'export default "apple-ios";');
    fs.writeFileSync(path.join(TEST_DIR, 'AppleOnly.tsx'), 'export default "apple-default";');

    fs.writeFileSync(
      path.join(TEST_DIR, 'Fallback.native.js'),
      'export default "native-fallback";'
    );
    fs.writeFileSync(path.join(TEST_DIR, 'Fallback.js'), 'export default "js-fallback";');

    fs.writeFileSync(path.join(TEST_DIR, 'OnlyDefault.js'), 'export default "only-default";');

    const subDir = path.join(TEST_DIR, 'SubDir');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'index.ios.js'), 'export default "sub-ios";');
    fs.writeFileSync(path.join(subDir, 'index.js'), 'export default "sub-default";');

    const pkgDir = path.join(TEST_DIR, 'PkgWithRNField');
    const pkgSrcDir = path.join(pkgDir, 'src');
    fs.mkdirSync(pkgSrcDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: 'test-pkg',
        main: 'index.js',
        'react-native': 'src/custom.js',
      })
    );
    fs.writeFileSync(path.join(pkgSrcDir, 'custom.ios.js'), 'export default "pkg-ios";');
    fs.writeFileSync(path.join(pkgSrcDir, 'custom.js'), 'export default "pkg-default";');

    // Setup dummy desktop packages in node_modules for redirection tests
    const nmDir = path.join(TEST_DIR, 'node_modules');
    const rnmDir = path.join(nmDir, 'react-native-macos');
    const rnwDir = path.join(nmDir, 'react-native-windows');
    const rnDir = path.join(nmDir, 'react-native');
    fs.mkdirSync(rnmDir, { recursive: true });
    fs.mkdirSync(rnwDir, { recursive: true });
    fs.mkdirSync(rnDir, { recursive: true });

    fs.writeFileSync(
      path.join(rnmDir, 'package.json'),
      JSON.stringify({ name: 'react-native-macos', main: 'index.js' })
    );
    fs.writeFileSync(path.join(rnmDir, 'index.js'), 'export const platform = "macos";');

    fs.writeFileSync(
      path.join(rnwDir, 'package.json'),
      JSON.stringify({ name: 'react-native-windows', main: 'index.js' })
    );
    fs.writeFileSync(path.join(rnwDir, 'index.js'), 'export const platform = "windows";');

    fs.writeFileSync(
      path.join(rnDir, 'package.json'),
      JSON.stringify({ name: 'react-native', main: 'index.js' })
    );
    fs.writeFileSync(path.join(rnDir, 'index.js'), 'export const platform = "core";');
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('resolves .ios.tsx when platform is ios', () => {
    const target = path.join(TEST_DIR, 'Component');
    const resolved = resolveFileWithPlatformExtensions(target, 'ios');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'Component.ios.tsx')));
  });

  it('resolves .android.tsx when platform is android', () => {
    const target = path.join(TEST_DIR, 'Component');
    const resolved = resolveFileWithPlatformExtensions(target, 'android');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'Component.android.tsx')));
  });

  it('falls back to .native when platform specific variant does not exist', () => {
    const target = path.join(TEST_DIR, 'Fallback');
    const resolved = resolveFileWithPlatformExtensions(target, 'ios');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'Fallback.native.js')));
  });

  it('falls back to default extension when platform and native do not exist', () => {
    const target = path.join(TEST_DIR, 'OnlyDefault');
    const resolved = resolveFileWithPlatformExtensions(target, 'ios');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'OnlyDefault.js')));
  });

  it('resolves platform variant even when extension is explicitly requested (e.g. Component.js)', () => {
    const target = path.join(TEST_DIR, 'Component.tsx');
    const resolved = resolveFileWithPlatformExtensions(target, 'ios');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'Component.ios.tsx')));
  });

  it('resolves directory index with platform extensions', () => {
    const target = path.join(TEST_DIR, 'SubDir');
    const resolvedIos = resolveDirectory(target, 'ios');
    expect(resolvedIos).toBe(fs.realpathSync(path.join(TEST_DIR, 'SubDir/index.ios.js')));

    const resolvedAndroid = resolveDirectory(target, 'android');
    expect(resolvedAndroid).toBe(fs.realpathSync(path.join(TEST_DIR, 'SubDir/index.js')));
  });

  it('respects react-native field in package.json and applies platform extensions', () => {
    const target = path.join(TEST_DIR, 'PkgWithRNField');
    const resolvedIos = resolveDirectory(target, 'ios');
    expect(resolvedIos).toBe(
      fs.realpathSync(path.join(TEST_DIR, 'PkgWithRNField/src/custom.ios.js'))
    );

    const resolvedAndroid = resolveDirectory(target, 'android');
    expect(resolvedAndroid).toBe(
      fs.realpathSync(path.join(TEST_DIR, 'PkgWithRNField/src/custom.js'))
    );
  });

  it('handles custom alias mapping in resolveSpecifier', () => {
    const resolved = resolveSpecifier('@test/comp', TEST_DIR, {
      platform: 'ios',
      projectRoot: TEST_DIR,
      alias: {
        '@test/comp': path.join(TEST_DIR, 'Component'),
      },
    });
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'Component.ios.tsx')));
  });

  it('resolves .macos.tsx when platform is macos', () => {
    const target = path.join(TEST_DIR, 'Component');
    const resolved = resolveFileWithPlatformExtensions(target, 'macos');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'Component.macos.tsx')));
  });

  it('resolves .windows.tsx when platform is windows', () => {
    const target = path.join(TEST_DIR, 'Component');
    const resolved = resolveFileWithPlatformExtensions(target, 'windows');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'Component.windows.tsx')));
  });

  it('falls back to .ios.tsx on macos when .macos.tsx does not exist', () => {
    const target = path.join(TEST_DIR, 'AppleOnly');
    const resolved = resolveFileWithPlatformExtensions(target, 'macos');
    expect(resolved).toBe(fs.realpathSync(path.join(TEST_DIR, 'AppleOnly.ios.tsx')));
  });

  it('redirects react-native to react-native-macos when platform is macos', () => {
    const resolved = resolveSpecifier('react-native', TEST_DIR, {
      platform: 'macos',
      projectRoot: TEST_DIR,
    });
    expect(resolved).toBe(
      fs.realpathSync(path.join(TEST_DIR, 'node_modules/react-native-macos/index.js'))
    );
  });

  it('redirects react-native to react-native-windows when platform is windows', () => {
    const resolved = resolveSpecifier('react-native', TEST_DIR, {
      platform: 'windows',
      projectRoot: TEST_DIR,
    });
    expect(resolved).toBe(
      fs.realpathSync(path.join(TEST_DIR, 'node_modules/react-native-windows/index.js'))
    );
  });
});
