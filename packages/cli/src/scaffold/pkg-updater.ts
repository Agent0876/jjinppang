import fs from 'node:fs';
import path from 'node:path';

export interface UpdatePackageJsonOptions {
  oxc?: boolean;
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

  // Add bun-rn scripts
  if (!pkgJson.scripts['start:bun']) {
    pkgJson.scripts['start:bun'] = 'bun-rn start';
  }
  if (!pkgJson.scripts['bundle:bun']) {
    pkgJson.scripts['bundle:bun'] = 'bun-rn bundle';
  }

  // Add react-native-bun-build dependency if not present
  if (
    !pkgJson.dependencies?.['react-native-bun-build'] &&
    !pkgJson.devDependencies?.['react-native-bun-build']
  ) {
    pkgJson.devDependencies['react-native-bun-build'] = '^0.1.0';
  }

  // Add OXC tooling if enabled
  if (options.oxc) {
    pkgJson.devDependencies['oxlint'] = pkgJson.devDependencies['oxlint'] || '^1.82.0';
    pkgJson.devDependencies['oxfmt'] = pkgJson.devDependencies['oxfmt'] || '^0.67.0';
    pkgJson.scripts['lint'] = pkgJson.scripts['lint'] || 'oxlint';
    pkgJson.scripts['lint:fix'] = pkgJson.scripts['lint:fix'] || 'oxlint --fix';
    pkgJson.scripts['format'] = pkgJson.scripts['format'] || 'oxfmt';
    pkgJson.scripts['format:check'] = pkgJson.scripts['format:check'] || 'oxfmt --check';
    pkgJson.scripts['check'] = pkgJson.scripts['check'] || 'oxlint && oxfmt --check';
  }

  if (!options.dryRun) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  }

  return { modified: true, pkgJson };
}
