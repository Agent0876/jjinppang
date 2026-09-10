import fs from 'node:fs';
import path from 'node:path';
import type { TargetPlatform } from '../types.js';

export interface UpdatePackageJsonOptions {
  oxc?: boolean;
  platforms?: TargetPlatform[];
  dryRun?: boolean;
}

export interface UpdatePackageJsonResult {
  modified: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pkgJson: any;
}

/**
 * Updates package.json scripts and dependencies for react-native-bun-build & OXC
 */
export function updatePackageJson(
  projectDir: string,
  options: UpdatePackageJsonOptions
): UpdatePackageJsonResult {
  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json not found in ${projectDir}`);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  pkgJson.scripts = pkgJson.scripts || {};
  pkgJson.devDependencies = pkgJson.devDependencies || {};

  const platforms =
    options.platforms && options.platforms.length > 0
      ? options.platforms
      : (['ios', 'android'] as TargetPlatform[]);

  // 1. Core Development & Bundling Scripts - powered by bun-rn
  pkgJson.scripts['start'] = 'bun-rn start';
  pkgJson.scripts['start:bun'] = 'bun-rn start';
  pkgJson.scripts['bundle'] = 'bun-rn bundle';

  if (platforms.includes('ios')) {
    pkgJson.scripts['ios'] = 'react-native run-ios';
    pkgJson.scripts['bundle:ios'] =
      'bun-rn bundle --entry-file index.js --platform ios --dev false --bundle-output dist/main.jsbundle --assets-dest dist/assets';
  }

  if (platforms.includes('android')) {
    pkgJson.scripts['android'] = 'react-native run-android';
    pkgJson.scripts['bundle:android'] =
      'bun-rn bundle --entry-file index.js --platform android --dev false --bundle-output dist/index.android.bundle --assets-dest dist/res';
  }

  if (platforms.includes('macos')) {
    pkgJson.scripts['macos'] = 'react-native run-macos';
    pkgJson.scripts['bundle:macos'] =
      'bun-rn bundle --entry-file index.js --platform macos --dev false --bundle-output dist/main.macos.jsbundle --assets-dest dist/assets';
    if (
      !pkgJson.dependencies?.['react-native-macos'] &&
      !pkgJson.devDependencies?.['react-native-macos']
    ) {
      pkgJson.devDependencies['react-native-macos'] = '^0.76.0';
    }
  }

  if (platforms.includes('windows')) {
    pkgJson.scripts['windows'] = 'react-native run-windows';
    pkgJson.scripts['bundle:windows'] =
      'bun-rn bundle --entry-file index.js --platform windows --dev false --bundle-output dist/main.windows.bundle --assets-dest dist/assets';
    if (
      !pkgJson.dependencies?.['react-native-windows'] &&
      !pkgJson.devDependencies?.['react-native-windows']
    ) {
      pkgJson.devDependencies['react-native-windows'] = '^0.76.0';
    }
  }

  // 2. Testing Scripts - powered by bun-rn test
  pkgJson.scripts['test'] = 'bun-rn test';

  // 3. Add react-native-bun-build dependency if not present
  if (
    !pkgJson.dependencies?.['react-native-bun-build'] &&
    !pkgJson.devDependencies?.['react-native-bun-build']
  ) {
    pkgJson.devDependencies['react-native-bun-build'] = '^0.1.0';
  }

  // 4. Code Quality Tooling - powered by bun-rn lint & bun-rn format
  if (options.oxc !== false) {
    pkgJson.devDependencies['oxlint'] = pkgJson.devDependencies['oxlint'] || '^1.82.0';
    pkgJson.devDependencies['oxfmt'] = pkgJson.devDependencies['oxfmt'] || '^0.67.0';
    pkgJson.scripts['lint'] = 'bun-rn lint';
    pkgJson.scripts['lint:fix'] = 'bun-rn lint --fix';
    pkgJson.scripts['format'] = 'bun-rn format';
    pkgJson.scripts['format:check'] = 'bun-rn format --check';
    pkgJson.scripts['check'] = 'bun-rn lint && bun-rn format --check && bun-rn test';
  }

  if (!options.dryRun) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  }

  return { modified: true, pkgJson };
}
