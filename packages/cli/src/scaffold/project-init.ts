import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { InitArguments, TargetPlatform } from '../types.js';
import { detectPackageManager, type PackageManagerType } from './pm-detector.js';
import { patchReactNativeConfig } from './rn-config-patcher.js';
import { generateBunBuildConfig } from './bun-config-gen.js';
import { setupOxc } from './oxc-setup.js';
import { updatePackageJson } from './pkg-updater.js';
import { runInstall, runPodInstall } from './installer.js';

export interface InitResult {
  mode: 'existing' | 'new';
  projectDir: string;
  packageManager: PackageManagerType;
  platforms: TargetPlatform[];
  patchedRnConfig: boolean;
  createdBunConfig: boolean;
  configuredOxc: boolean;
  installedDependencies: boolean;
}

export function parsePlatforms(raw?: TargetPlatform[] | string): TargetPlatform[] {
  if (!raw) return ['ios', 'android'];
  if (Array.isArray(raw)) return raw;
  if (raw === 'all') return ['ios', 'android', 'macos', 'windows'];
  const parsed = raw
    .split(',')
    .map((p) => p.trim().toLowerCase() as TargetPlatform)
    .filter((p) => ['ios', 'android', 'macos', 'windows'].includes(p));
  return parsed.length > 0 ? parsed : ['ios', 'android'];
}

/**
 * Configure an existing React Native project
 */
export async function initExistingProject(
  projectDir: string,
  options: InitArguments
): Promise<InitResult> {
  console.log(`\n⚡ [react-native-bun-build] Configuring existing React Native project...`);
  console.log(`📂 Project directory: ${projectDir}`);

  const pkgPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      `No package.json found at ${projectDir}. Make sure you run inside a React Native project.`
    );
  }

  const initialPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const isReactNative =
    Boolean(initialPkg.dependencies?.['react-native']) ||
    Boolean(initialPkg.devDependencies?.['react-native']) ||
    Boolean(initialPkg.dependencies?.['react-native-macos']) ||
    Boolean(initialPkg.devDependencies?.['react-native-macos']) ||
    Boolean(initialPkg.dependencies?.['react-native-windows']) ||
    Boolean(initialPkg.devDependencies?.['react-native-windows']);

  if (!isReactNative && !options.force) {
    throw new Error(
      `"react-native", "react-native-macos", or "react-native-windows" dependency was not found in package.json at ${projectDir}. Use --force to proceed anyway.`
    );
  }

  const pm = (options.pm as PackageManagerType) || detectPackageManager(projectDir);
  console.log(`🔧 Detected package manager: ${pm}`);

  const dryRun = Boolean(options.dryRun);
  if (dryRun) {
    console.log(`🔍 Running in DRY-RUN mode. No files will be changed.`);
  }

  // 1. Patch react-native.config.js
  const rnConfigRes = patchReactNativeConfig(projectDir, dryRun);
  if (rnConfigRes.status === 'created') {
    console.log(`  ✅ Created ${path.relative(projectDir, rnConfigRes.file)} with custom commands`);
  } else if (rnConfigRes.status === 'patched') {
    console.log(
      `  ✅ Patched ${path.relative(projectDir, rnConfigRes.file)} to include bun-build commands`
    );
  } else {
    console.log(
      `  ℹ️ ${path.relative(projectDir, rnConfigRes.file)} already contains bun-build commands`
    );
  }

  // 2. Generate react-native-bun-build.config.js
  const bunConfigRes = generateBunBuildConfig(projectDir, initialPkg, dryRun, options.force);
  if (bunConfigRes.status === 'created') {
    console.log(`  ✅ Created ${path.relative(projectDir, bunConfigRes.file)}`);
  } else {
    console.log(`  ℹ️ ${path.relative(projectDir, bunConfigRes.file)} already exists (skipping)`);
  }

  // 3. Setup OXC tooling if requested (default: true)
  const setupOxcEnabled = options.oxc !== false;
  let configuredOxc = false;
  if (setupOxcEnabled) {
    const oxcRes = setupOxc(projectDir, dryRun, options.force);
    configuredOxc = oxcRes.configured;
    console.log(`  ✅ Configured OXC linter (.oxlintrc.json) & formatter (.oxfmtrc.json)`);
  }

  // 4. Update package.json scripts and dependencies
  const platforms = parsePlatforms(options.platforms);
  updatePackageJson(projectDir, {
    oxc: setupOxcEnabled,
    platforms,
    dryRun,
  });
  console.log(`  ✅ Updated package.json (configured bun-rn scripts for ${platforms.join(', ')})`);

  // 5. Run install if not skipped and not dry-run
  let installed = false;
  if (!options.skipInstall && !dryRun) {
    installed = runInstall(projectDir, pm);
  }

  return {
    mode: 'existing',
    projectDir,
    packageManager: pm,
    platforms,
    patchedRnConfig: rnConfigRes.status !== 'already_configured',
    createdBunConfig: bunConfigRes.status === 'created',
    configuredOxc,
    installedDependencies: installed,
  };
}

/**
 * Scaffolds a new React Native project and then configures react-native-bun-build
 */
export async function initNewProject(
  projectName: string,
  targetParentDir: string,
  options: InitArguments
): Promise<InitResult> {
  const projectDir = path.join(targetParentDir, projectName);

  if (fs.existsSync(projectDir) && fs.readdirSync(projectDir).length > 0 && !options.force) {
    throw new Error(
      `Directory ${projectDir} already exists and is not empty. Use --force or specify a different name.`
    );
  }

  console.log(
    `\n🚀 [react-native-bun-build] Scaffolding new React Native project: ${projectName}...`
  );

  const dryRun = Boolean(options.dryRun);
  if (dryRun) {
    console.log(`🔍 Running in DRY-RUN mode. Would scaffold project into ${projectDir}`);
    return {
      mode: 'new',
      projectDir,
      packageManager: (options.pm as PackageManagerType) || 'bun',
      platforms: parsePlatforms(options.platforms),
      patchedRnConfig: true,
      createdBunConfig: true,
      configuredOxc: true,
      installedDependencies: false,
    };
  }

  // 1. Scaffold native React Native structure using @react-native-community/cli
  console.log(`📱 Generating project files with React Native CLI...`);
  const initArgs = [
    '@react-native-community/cli',
    'init',
    projectName,
    '--pm',
    options.pm || 'bun',
    '--skip-install',
  ];
  if (options.template) {
    initArgs.push('--template', options.template);
  }

  const scaffoldRes = spawnSync('bunx', initArgs, {
    cwd: targetParentDir,
    stdio: 'inherit',
    shell: true,
  });

  if (scaffoldRes.status !== 0) {
    // If bunx failed, fallback to npx
    console.log(`⚠️ bunx failed, falling back to npx...`);
    spawnSync('npx', initArgs, {
      cwd: targetParentDir,
      stdio: 'inherit',
      shell: true,
    });
  }

  // 2. Configure react-native-bun-build in the new project
  const configureResult = await initExistingProject(projectDir, {
    ...options,
    existing: true,
    skipInstall: true, // we will do unified install next
  });

  // 3. Install packages
  let installed = false;
  const pm = (options.pm as PackageManagerType) || 'bun';
  if (!options.skipInstall) {
    installed = runInstall(projectDir, pm);
  }

  // 4. Run CocoaPods on macOS
  if (process.platform === 'darwin' && !options.skipPods && !options.skipInstall) {
    runPodInstall(projectDir);
  }

  return {
    ...configureResult,
    mode: 'new',
    installedDependencies: installed,
  };
}
