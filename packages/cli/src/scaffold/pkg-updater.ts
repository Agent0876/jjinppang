import fs from 'node:fs';
import path from 'node:path';
import type { TargetPlatform } from '../types.js';

export interface PackageJson {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface UpdatePackageJsonOptions {
  oxc?: boolean;
  platforms?: TargetPlatform[];
  rnVersion?: string;
  dryRun?: boolean;
}

export interface UpdatePackageJsonResult {
  modified: boolean;
  pkgJson: PackageJson;
}

/**
 * Resolves the appropriate version for desktop platforms (react-native-macos / react-native-windows)
 * aligned with the project's react-native version or using the latest npm release.
 */
export function resolveDesktopVersion(
  pkgJson: PackageJson,
  pkgName: 'react-native-macos' | 'react-native-windows'
): string {
  const rnVersion =
    pkgJson.dependencies?.['react-native'] || pkgJson.devDependencies?.['react-native'];

  if (pkgName === 'react-native-macos') {
    if (rnVersion && typeof rnVersion === 'string') {
      const match = rnVersion.match(/0\.(\d+)/);
      if (match) {
        const minor = parseInt(match[1], 10);
        if (minor <= 81) {
          return `^0.${minor}.0`;
        }
      }
    }
    return '^0.81.9';
  }

  if (pkgName === 'react-native-windows') {
    if (rnVersion && typeof rnVersion === 'string') {
      const match = rnVersion.match(/0\.(\d+)/);
      if (match) {
        const minor = parseInt(match[1], 10);
        if (minor <= 84) {
          return `^0.${minor}.0`;
        }
      }
    }
    return '^0.84.0';
  }

  return '^0.87.1';
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

  // 0. Update react-native version if specified
  if (options.rnVersion) {
    if (pkgJson.dependencies?.['react-native']) {
      pkgJson.dependencies['react-native'] = options.rnVersion;
    }
    if (pkgJson.devDependencies?.['@react-native/babel-preset']) {
      pkgJson.devDependencies['@react-native/babel-preset'] = options.rnVersion;
    }
    if (pkgJson.devDependencies?.['@react-native/metro-config']) {
      pkgJson.devDependencies['@react-native/metro-config'] = options.rnVersion;
    }
    if (pkgJson.devDependencies?.['@react-native/typescript-config']) {
      pkgJson.devDependencies['@react-native/typescript-config'] = options.rnVersion;
    }
  }

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
      pkgJson.devDependencies['react-native-macos'] = resolveDesktopVersion(
        pkgJson,
        'react-native-macos'
      );
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
      pkgJson.devDependencies['react-native-windows'] = resolveDesktopVersion(
        pkgJson,
        'react-native-windows'
      );
    }
  }

  // 2. Testing Scripts - powered by bun-rn test
  pkgJson.scripts['test'] = 'bun-rn test';

  // 3. Add react-native-bun-build dependency if not present
  if (
    !pkgJson.dependencies?.['react-native-bun-build'] &&
    !pkgJson.devDependencies?.['react-native-bun-build']
  ) {
    const parentMonorepoPkg = path.join(projectDir, '..', 'package.json');
    let isMonorepoWorkspace = false;
    if (fs.existsSync(parentMonorepoPkg)) {
      try {
        const parentPkg = JSON.parse(fs.readFileSync(parentMonorepoPkg, 'utf8'));
        if (parentPkg.name === 'react-native-bun-build-monorepo') {
          isMonorepoWorkspace = true;
          const folderName = path.basename(projectDir);
          if (Array.isArray(parentPkg.workspaces) && !parentPkg.workspaces.includes(folderName)) {
            parentPkg.workspaces.push(folderName);
            fs.writeFileSync(parentMonorepoPkg, JSON.stringify(parentPkg, null, 2) + '\n', 'utf8');
          }
        }
      } catch {
        // ignore
      }
    }

    pkgJson.devDependencies['react-native-bun-build'] = isMonorepoWorkspace
      ? 'workspace:*'
      : '^0.1.0';
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

    // Remove legacy ESLint / Prettier packages when OXC is configured
    delete pkgJson.devDependencies['eslint'];
    delete pkgJson.devDependencies['@react-native/eslint-config'];
    delete pkgJson.devDependencies['prettier'];
    if (pkgJson.dependencies) {
      delete pkgJson.dependencies['eslint'];
      delete pkgJson.dependencies['prettier'];
    }
  }

  if (!options.dryRun) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  }

  return { modified: true, pkgJson };
}
