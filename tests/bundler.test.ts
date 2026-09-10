import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { bundle, defineConfig } from '../packages/core/src/index.js';

const TEST_DIR = path.join(__dirname, '.temp-bundle-e2e-test');

const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);

describe('End-to-End Bun Bundling', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Mock react-native package structure
    const rnDir = path.join(TEST_DIR, 'node_modules', 'react-native');
    const rnCoreDir = path.join(rnDir, 'Libraries', 'Core');
    const rnImgDir = path.join(rnDir, 'Libraries', 'Image');
    fs.mkdirSync(rnCoreDir, { recursive: true });
    fs.mkdirSync(rnImgDir, { recursive: true });

    fs.writeFileSync(
      path.join(rnDir, 'package.json'),
      JSON.stringify({
        name: 'react-native',
        main: 'index.js',
      })
    );
    fs.writeFileSync(
      path.join(rnDir, 'index.js'),
      'module.exports = { AppRegistry: { registerComponent: () => {} } };'
    );
    fs.writeFileSync(
      path.join(rnCoreDir, 'InitializeCore.js'),
      'global.__INITIALIZED_CORE__ = true;'
    );
    fs.writeFileSync(
      path.join(rnImgDir, 'AssetRegistry.js'),
      'module.exports = { registerAsset: (asset) => asset };'
    );

    // App files
    const assetsDir = path.join(TEST_DIR, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), PNG_1X1);
    fs.writeFileSync(path.join(assetsDir, 'icon@2x.png'), PNG_1X1);

    fs.writeFileSync(
      path.join(TEST_DIR, 'PlatformText.ios.js'),
      'export const message = "Platform: iOS";'
    );
    fs.writeFileSync(
      path.join(TEST_DIR, 'PlatformText.android.js'),
      'export const message = "Platform: Android";'
    );
    fs.writeFileSync(
      path.join(TEST_DIR, 'PlatformText.macos.js'),
      'export const message = "Platform: macOS";'
    );
    fs.writeFileSync(
      path.join(TEST_DIR, 'PlatformText.windows.js'),
      'export const message = "Platform: Windows";'
    );

    fs.writeFileSync(
      path.join(TEST_DIR, 'App.js'),
      `import { message } from './PlatformText';
import icon from './assets/icon.png';
import { AppRegistry } from 'react-native';

export function App() {
  return { message, icon };
}
AppRegistry.registerComponent('App', () => App);
`
    );

    fs.writeFileSync(path.join(TEST_DIR, 'index.js'), `import './App';`);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('bundles iOS application with platform resolution, assets and sourcemaps', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'ios', 'main.jsbundle');
    const sourcemapOutput = path.join(TEST_DIR, 'dist', 'ios', 'main.jsbundle.map');
    const assetsDest = path.join(TEST_DIR, 'dist', 'ios', 'assets');

    const result = await bundle({
      projectRoot: TEST_DIR,
      entryFile: 'index.js',
      platform: 'ios',
      dev: false,
      minify: false,
      bundleOutput,
      sourcemapOutput,
      assetsDest,
      hermes: { enabled: false }, // test pure JS bundle first
    });

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(fs.existsSync(bundleOutput)).toBe(true);
    expect(fs.existsSync(sourcemapOutput)).toBe(true);

    const bundleContent = fs.readFileSync(bundleOutput, 'utf8');
    expect(bundleContent).toContain('Platform: iOS');
    expect(bundleContent).not.toContain('Platform: Android');
    expect(bundleContent).toContain('__INITIALIZED_CORE__');
    expect(bundleContent).toContain('registerAsset');

    // Check assets were copied
    expect(fs.existsSync(path.join(assetsDest, 'assets', 'icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDest, 'assets', 'icon@2x.png'))).toBe(true);
  });

  it('bundles Android application with android platform resolution and drawable assets', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'android', 'index.android.bundle');
    const assetsDest = path.join(TEST_DIR, 'dist', 'android', 'res');

    const _result = await bundle({
      projectRoot: TEST_DIR,
      entryFile: 'index.js',
      platform: 'android',
      dev: false,
      minify: false,
      bundleOutput,
      assetsDest,
      hermes: { enabled: false },
    });

    expect(fs.existsSync(bundleOutput)).toBe(true);
    const bundleContent = fs.readFileSync(bundleOutput, 'utf8');
    expect(bundleContent).toContain('Platform: Android');
    expect(bundleContent).not.toContain('Platform: iOS');

    // Check Android drawable assets
    expect(fs.existsSync(path.join(assetsDest, 'drawable-mdpi', 'assets_icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDest, 'drawable-xhdpi', 'assets_icon.png'))).toBe(true);
  });

  it('bundles macOS application with macos platform resolution and assets', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'macos', 'index.macos.jsbundle');
    const assetsDest = path.join(TEST_DIR, 'dist', 'macos', 'assets');

    const result = await bundle({
      projectRoot: TEST_DIR,
      entryFile: 'index.js',
      platform: 'macos',
      dev: false,
      minify: false,
      bundleOutput,
      assetsDest,
      hermes: { enabled: false },
    });

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(fs.existsSync(bundleOutput)).toBe(true);

    const bundleContent = fs.readFileSync(bundleOutput, 'utf8');
    expect(bundleContent).toContain('Platform: macOS');
    expect(bundleContent).not.toContain('Platform: iOS');
    expect(bundleContent).not.toContain('Platform: Windows');

    // Check macOS preserves directory asset structure
    expect(fs.existsSync(path.join(assetsDest, 'assets', 'icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDest, 'assets', 'icon@2x.png'))).toBe(true);
  });

  it('bundles Windows application with windows platform resolution and assets', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'windows', 'index.windows.bundle');
    const assetsDest = path.join(TEST_DIR, 'dist', 'windows', 'assets');

    const result = await bundle({
      projectRoot: TEST_DIR,
      entryFile: 'index.js',
      platform: 'windows',
      dev: false,
      minify: false,
      bundleOutput,
      assetsDest,
      hermes: { enabled: false },
    });

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(fs.existsSync(bundleOutput)).toBe(true);

    const bundleContent = fs.readFileSync(bundleOutput, 'utf8');
    expect(bundleContent).toContain('Platform: Windows');
    expect(bundleContent).not.toContain('Platform: iOS');
    expect(bundleContent).not.toContain('Platform: macOS');

    // Check Windows preserves asset directory structure
    expect(fs.existsSync(path.join(assetsDest, 'assets', 'icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDest, 'assets', 'icon@2x.png'))).toBe(true);
  });

  it('supports defineConfig helper for user configuration files', () => {
    const config = defineConfig({
      hermes: { enabled: true },
      assetExtensions: ['png', 'jpg'],
      minify: true,
    });

    expect(config.hermes?.enabled).toBe(true);
    expect(config.assetExtensions).toEqual(['png', 'jpg']);
    expect(config.minify).toBe(true);
  });
});
