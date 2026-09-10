import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectPackageManager,
  patchReactNativeConfig,
  generateBunBuildConfig,
  setupOxc,
  updatePackageJson,
  initExistingProject,
  resolveDesktopVersion,
} from '../packages/cli/src/commands/init.js';

const TEST_DIR = path.join(__dirname, '.temp-init-test');

describe('Init Command & Project Scaffolding', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('detectPackageManager identifies lockfiles accurately', () => {
    // 1. Bun lockfile
    fs.writeFileSync(path.join(TEST_DIR, 'bun.lock'), '');
    expect(detectPackageManager(TEST_DIR)).toBe('bun');
    fs.unlinkSync(path.join(TEST_DIR, 'bun.lock'));

    // 2. pnpm lockfile
    fs.writeFileSync(path.join(TEST_DIR, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(TEST_DIR)).toBe('pnpm');
    fs.unlinkSync(path.join(TEST_DIR, 'pnpm-lock.yaml'));

    // 3. yarn lockfile
    fs.writeFileSync(path.join(TEST_DIR, 'yarn.lock'), '');
    expect(detectPackageManager(TEST_DIR)).toBe('yarn');
    fs.unlinkSync(path.join(TEST_DIR, 'yarn.lock'));

    // 4. npm lockfile
    fs.writeFileSync(path.join(TEST_DIR, 'package-lock.json'), '');
    expect(detectPackageManager(TEST_DIR)).toBe('npm');
  });

  test('patchReactNativeConfig creates react-native.config.js if none exists', () => {
    const res = patchReactNativeConfig(TEST_DIR, false);
    expect(res.status).toBe('created');
    expect(fs.existsSync(res.file)).toBe(true);

    const content = fs.readFileSync(res.file, 'utf8');
    expect(content).toContain("commands: require('react-native-bun-build/commands')");
  });

  test('patchReactNativeConfig safely updates existing react-native.config.js', () => {
    const configPath = path.join(TEST_DIR, 'react-native.config.js');
    fs.writeFileSync(
      configPath,
      `module.exports = {
  dependencies: {
    'some-library': {
      platforms: { ios: null },
    },
  },
};`
    );

    const res = patchReactNativeConfig(TEST_DIR, false);
    expect(res.status).toBe('patched');

    const content = fs.readFileSync(configPath, 'utf8');
    expect(content).toContain("commands: require('react-native-bun-build/commands')");
    expect(content).toContain('some-library');

    // Calling again should be idempotent
    const secondRes = patchReactNativeConfig(TEST_DIR, false);
    expect(secondRes.status).toBe('already_configured');
  });

  test('generateBunBuildConfig detects react-native-reanimated and creates config', () => {
    const pkgWithReanimated = {
      name: 'SampleApp',
      dependencies: {
        'react-native': '^0.77.0',
        'react-native-reanimated': '^3.16.0',
      },
    };

    const res = generateBunBuildConfig(TEST_DIR, pkgWithReanimated, false);
    expect(res.status).toBe('created');
    expect(fs.existsSync(res.file)).toBe(true);

    const content = fs.readFileSync(res.file, 'utf8');
    expect(content).toContain('/react-native-reanimated/');
    expect(content).toContain('assetExtensions');
    expect(content).toContain('hermes');

    // Calling again should skip unless force: true
    const secondRes = generateBunBuildConfig(TEST_DIR, pkgWithReanimated, false, false);
    expect(secondRes.status).toBe('skipped');
  });

  test('setupOxc creates .oxlintrc.json and .oxfmtrc.json configs', () => {
    const res = setupOxc(TEST_DIR, false);
    expect(res.configured).toBe(true);
    expect(fs.existsSync(res.oxlintFile)).toBe(true);
    expect(fs.existsSync(res.oxfmtFile)).toBe(true);

    const oxlint = JSON.parse(fs.readFileSync(res.oxlintFile, 'utf8'));
    expect(oxlint.plugins).toContain('oxc');
    expect(oxlint.categories.correctness).toBe('error');

    const oxfmt = JSON.parse(fs.readFileSync(res.oxfmtFile, 'utf8'));
    expect(oxfmt.tabWidth).toBe(2);
    expect(oxfmt.semi).toBe(true);
  });

  test('updatePackageJson adds dependencies and scripts', () => {
    const pkgPath = path.join(TEST_DIR, 'package.json');
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({
        name: 'MyCoolApp',
        version: '1.0.0',
        dependencies: {
          'react-native': '0.77.0',
        },
      })
    );

    const { pkgJson } = updatePackageJson(TEST_DIR, {
      oxc: true,
      platforms: ['ios', 'android'],
      dryRun: false,
    });
    expect(pkgJson.devDependencies['react-native-bun-build']).toBe('^0.1.0');
    expect(pkgJson.devDependencies['oxlint']).toBeDefined();
    expect(pkgJson.devDependencies['oxfmt']).toBeDefined();
    expect(pkgJson.scripts['start']).toBe('bun-rn start');
    expect(pkgJson.scripts['start:bun']).toBe('bun-rn start');
    expect(pkgJson.scripts['bundle']).toBe('bun-rn bundle');
    expect(pkgJson.scripts['bundle:ios']).toContain('bun-rn bundle');
    expect(pkgJson.scripts['bundle:android']).toContain('bun-rn bundle');
    expect(pkgJson.scripts['lint']).toBe('bun-rn lint');
    expect(pkgJson.scripts['lint:fix']).toBe('bun-rn lint --fix');
    expect(pkgJson.scripts['format']).toBe('bun-rn format');
    expect(pkgJson.scripts['format:check']).toBe('bun-rn format --check');
    expect(pkgJson.scripts['test']).toBe('bun-rn test');
    expect(pkgJson.scripts['check']).toBe('bun-rn lint && bun-rn format --check && bun-rn test');
  });

  test('updatePackageJson configures macOS and Windows desktop scripts and dependencies', () => {
    const pkgPath = path.join(TEST_DIR, 'package.json');
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({
        name: 'DesktopApp',
        version: '1.0.0',
        dependencies: {},
      })
    );

    const { pkgJson } = updatePackageJson(TEST_DIR, {
      platforms: ['macos', 'windows'],
      oxc: false,
      dryRun: false,
    });

    expect(pkgJson.scripts['macos']).toBe('react-native run-macos');
    expect(pkgJson.scripts['bundle:macos']).toContain('bun-rn bundle');
    expect(pkgJson.scripts['windows']).toBe('react-native run-windows');
    expect(pkgJson.scripts['bundle:windows']).toContain('bun-rn bundle');
    expect(pkgJson.devDependencies['react-native-macos']).toBe('^0.81.9');
    expect(pkgJson.devDependencies['react-native-windows']).toBe('^0.84.0');

    // Test dynamic alignment with project's react-native version
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '^0.78.0' } }, 'react-native-macos')
    ).toBe('^0.78.0');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '^0.80.0' } }, 'react-native-windows')
    ).toBe('^0.80.0');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '0.87.1' } }, 'react-native-macos')
    ).toBe('^0.81.9');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '0.87.1' } }, 'react-native-windows')
    ).toBe('^0.84.0');
  });

  test('initExistingProject runs end-to-end configuration successfully', async () => {
    const pkgPath = path.join(TEST_DIR, 'package.json');
    fs.writeFileSync(
      pkgPath,
      JSON.stringify(
        {
          name: 'MyExistingApp',
          dependencies: {
            'react-native': '0.77.0',
            'react-native-reanimated': '^3.16.0',
          },
        },
        null,
        2
      )
    );

    const result = await initExistingProject(TEST_DIR, {
      skipInstall: true,
      dryRun: false,
      oxc: true,
    });

    expect(result.mode).toBe('existing');
    expect(result.patchedRnConfig).toBe(true);
    expect(result.createdBunConfig).toBe(true);
    expect(result.configuredOxc).toBe(true);

    // Verify all generated files exist on disk
    expect(fs.existsSync(path.join(TEST_DIR, 'react-native.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'react-native-bun-build.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, '.oxlintrc.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, '.oxfmtrc.json'))).toBe(true);

    const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(updatedPkg.devDependencies['react-native-bun-build']).toBeDefined();
    expect(updatedPkg.scripts['start']).toBe('bun-rn start');
    expect(updatedPkg.scripts['start:bun']).toBe('bun-rn start');
    expect(updatedPkg.scripts['lint']).toBe('bun-rn lint');
    expect(updatedPkg.scripts['format']).toBe('bun-rn format');
    expect(updatedPkg.scripts['test']).toBe('bun-rn test');
    expect(updatedPkg.scripts['bundle']).toBe('bun-rn bundle');
  });

  test('initExistingProject dryRun does not write any files', async () => {
    const pkgPath = path.join(TEST_DIR, 'package.json');
    const initialContent = JSON.stringify(
      {
        name: 'DryRunApp',
        dependencies: {
          'react-native': '0.77.0',
        },
      },
      null,
      2
    );
    fs.writeFileSync(pkgPath, initialContent);

    const result = await initExistingProject(TEST_DIR, {
      skipInstall: true,
      dryRun: true,
      oxc: true,
    });

    expect(result.mode).toBe('existing');
    // Config files should not have been created
    expect(fs.existsSync(path.join(TEST_DIR, 'react-native.config.js'))).toBe(false);
    expect(fs.existsSync(path.join(TEST_DIR, 'react-native-bun-build.config.js'))).toBe(false);
    expect(fs.existsSync(path.join(TEST_DIR, '.oxlintrc.json'))).toBe(false);

    // package.json should remain untouched
    expect(fs.readFileSync(pkgPath, 'utf8')).toBe(initialContent);
  });

  test('initExistingProject supports pure desktop React Native apps (react-native-macos / react-native-windows)', async () => {
    const pkgPath = path.join(TEST_DIR, 'package.json');
    fs.writeFileSync(
      pkgPath,
      JSON.stringify(
        {
          name: 'MyDesktopMacApp',
          dependencies: {
            'react-native-macos': '^0.81.9',
          },
        },
        null,
        2
      )
    );

    const result = await initExistingProject(TEST_DIR, {
      skipInstall: true,
      dryRun: false,
      oxc: true,
    });

    expect(result.mode).toBe('existing');
    expect(result.patchedRnConfig).toBe(true);
    expect(result.createdBunConfig).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'react-native.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, 'react-native-bun-build.config.js'))).toBe(true);
  });

  test('TUI colors and symbols format terminal strings', async () => {
    const { colors, symbols } = await import('../packages/cli/src/ui/colors.js');
    expect(colors.reset).toBe('\x1b[0m');
    expect(colors.bold).toBe('\x1b[1m');
    expect(symbols.check).toContain('✔');
    expect(symbols.arrow).toContain('❯');
  });

  test('resolveDesktopVersion dynamically resolves up-to-date versions', () => {
    // macOS resolution
    expect(resolveDesktopVersion({}, 'react-native-macos')).toBe('^0.81.9');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '^0.77.1' } }, 'react-native-macos')
    ).toBe('^0.77.0');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '0.81.3' } }, 'react-native-macos')
    ).toBe('^0.81.0');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '0.87.1' } }, 'react-native-macos')
    ).toBe('^0.81.9');

    // Windows resolution
    expect(resolveDesktopVersion({}, 'react-native-windows')).toBe('^0.84.0');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '^0.78.2' } }, 'react-native-windows')
    ).toBe('^0.78.0');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '0.84.0' } }, 'react-native-windows')
    ).toBe('^0.84.0');
    expect(
      resolveDesktopVersion({ dependencies: { 'react-native': '0.87.1' } }, 'react-native-windows')
    ).toBe('^0.84.0');
  });
});
