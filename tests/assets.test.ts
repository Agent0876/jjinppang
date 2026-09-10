import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseAssetFilename,
  findAssetScaleVariants,
  getImageDimensions,
  generateAssetModuleCode,
  copyAssetsToDestination,
  getAndroidDrawableFolder,
  getAndroidResourceIdentifier,
} from '../packages/core/src/assets/index.js';
import type { AssetMetadata } from '../packages/core/src/types.js';

const TEST_DIR = path.join(__dirname, '.temp-assets-test');

// Valid 1x1 PNG bytes
const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);
// Valid 2x2 PNG bytes
const PNG_2X2 = Buffer.from(
  '89504e470d0a1a0a0000000d494844520000000200000002080600000072b60d240000000c49444154789c636060606000000004000127345b640000000049454e44ae426082',
  'hex'
);

describe('React Native Asset Pipeline', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    const imagesDir = path.join(TEST_DIR, 'src', 'images');
    fs.mkdirSync(imagesDir, { recursive: true });

    // Create logo.png, logo@2x.png, logo@3x.png
    fs.writeFileSync(path.join(imagesDir, 'logo.png'), PNG_1X1);
    fs.writeFileSync(path.join(imagesDir, 'logo@2x.png'), PNG_2X2);
    fs.writeFileSync(path.join(imagesDir, 'logo@3x.png'), PNG_2X2);

    // Create a font file
    const fontsDir = path.join(TEST_DIR, 'src', 'fonts');
    fs.mkdirSync(fontsDir, { recursive: true });
    fs.writeFileSync(path.join(fontsDir, 'CustomFont.ttf'), 'mock-font-data');
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('parses asset filename correctly', () => {
    expect(parseAssetFilename('icon.png')).toEqual({
      name: 'icon',
      scale: 1,
      ext: 'png',
    });
    expect(parseAssetFilename('icon@2x.png')).toEqual({
      name: 'icon',
      scale: 2,
      ext: 'png',
    });
    expect(parseAssetFilename('banner@3x.jpg')).toEqual({
      name: 'banner',
      scale: 3,
      ext: 'jpg',
    });
  });

  it('finds all scale variants in folder and groups them', () => {
    const imagesDir = path.join(TEST_DIR, 'src', 'images');
    const variants = findAssetScaleVariants(imagesDir, 'logo', 'png');

    expect(variants.length).toBe(3);
    expect(variants.map((v) => v.scale)).toEqual([1, 2, 3]);
  });

  it('extracts dimensions correctly from image files', () => {
    const p1x = path.join(TEST_DIR, 'src', 'images', 'logo.png');
    const p2x = path.join(TEST_DIR, 'src', 'images', 'logo@2x.png');

    const dim1 = getImageDimensions(p1x, 1);
    expect(dim1.width).toBe(1);
    expect(dim1.height).toBe(1);

    const dim2 = getImageDimensions(p2x, 2);
    expect(dim2.width).toBe(1); // 2px / 2x = 1
    expect(dim2.height).toBe(1);
  });

  it('generates valid AssetRegistry.registerAsset code', () => {
    const mockAsset: AssetMetadata = {
      __packager_asset: true,
      httpServerLocation: '/assets/src/images',
      width: 100,
      height: 100,
      scales: [1, 2, 3],
      hash: 'abc123hash',
      name: 'logo',
      type: 'png',
      files: [],
    };

    const code = generateAssetModuleCode(mockAsset);
    expect(code).toContain('require("react-native/Libraries/Image/AssetRegistry")');
    expect(code).toContain('registerAsset({');
    expect(code).toContain('__packager_asset: true');
    expect(code).toContain('httpServerLocation: "/assets/src/images"');
    expect(code).toContain('width: 100');
    expect(code).toContain('scales: [1,2,3]');
    expect(code).toContain('hash: "abc123hash"');
  });

  it('maps scales to correct Android drawable folder names', () => {
    expect(getAndroidDrawableFolder(0.75)).toBe('drawable-ldpi');
    expect(getAndroidDrawableFolder(1)).toBe('drawable-mdpi');
    expect(getAndroidDrawableFolder(1.5)).toBe('drawable-hdpi');
    expect(getAndroidDrawableFolder(2)).toBe('drawable-xhdpi');
    expect(getAndroidDrawableFolder(3)).toBe('drawable-xxhdpi');
    expect(getAndroidDrawableFolder(4)).toBe('drawable-xxxhdpi');
  });

  it('generates sanitized Android resource identifiers', () => {
    const id = getAndroidResourceIdentifier(
      TEST_DIR,
      path.join(TEST_DIR, 'src', 'images', 'my-custom_Logo@2x.png')
    );
    expect(id).toBe('src_images_my_custom_logo');
  });

  it('copies assets for iOS destination preserving directory structure', () => {
    const imagesDir = path.join(TEST_DIR, 'src', 'images');
    const destIos = path.join(TEST_DIR, 'dest-ios');

    const asset: AssetMetadata = {
      __packager_asset: true,
      httpServerLocation: '/assets/src/images',
      width: 1,
      height: 1,
      scales: [1, 2, 3],
      hash: 'fakehash',
      name: 'logo',
      type: 'png',
      files: [
        { scale: 1, path: path.join(imagesDir, 'logo.png') },
        { scale: 2, path: path.join(imagesDir, 'logo@2x.png') },
        { scale: 3, path: path.join(imagesDir, 'logo@3x.png') },
      ],
    };

    copyAssetsToDestination([asset], destIos, 'ios', TEST_DIR);

    expect(fs.existsSync(path.join(destIos, 'src', 'images', 'logo.png'))).toBe(true);
    expect(fs.existsSync(path.join(destIos, 'src', 'images', 'logo@2x.png'))).toBe(true);
    expect(fs.existsSync(path.join(destIos, 'src', 'images', 'logo@3x.png'))).toBe(true);
  });

  it('copies assets for Android destination into drawable-* and raw folders', () => {
    const imagesDir = path.join(TEST_DIR, 'src', 'images');
    const fontsDir = path.join(TEST_DIR, 'src', 'fonts');
    const destAndroid = path.join(TEST_DIR, 'dest-android');

    const imageAsset: AssetMetadata = {
      __packager_asset: true,
      httpServerLocation: '/assets/src/images',
      width: 1,
      height: 1,
      scales: [1, 2],
      hash: 'fakehash',
      name: 'logo',
      type: 'png',
      files: [
        { scale: 1, path: path.join(imagesDir, 'logo.png') },
        { scale: 2, path: path.join(imagesDir, 'logo@2x.png') },
      ],
    };

    const fontAsset: AssetMetadata = {
      __packager_asset: true,
      httpServerLocation: '/assets/src/fonts',
      width: 0,
      height: 0,
      scales: [1],
      hash: 'fontfakehash',
      name: 'CustomFont',
      type: 'ttf',
      files: [{ scale: 1, path: path.join(fontsDir, 'CustomFont.ttf') }],
    };

    copyAssetsToDestination([imageAsset, fontAsset], destAndroid, 'android', TEST_DIR);

    // 1x image should go to drawable-mdpi
    expect(fs.existsSync(path.join(destAndroid, 'drawable-mdpi', 'src_images_logo.png'))).toBe(
      true
    );
    // 2x image should go to drawable-xhdpi
    expect(fs.existsSync(path.join(destAndroid, 'drawable-xhdpi', 'src_images_logo.png'))).toBe(
      true
    );
    // font should go to raw/
    expect(fs.existsSync(path.join(destAndroid, 'raw', 'src_fonts_customfont.ttf'))).toBe(true);
  });
});
