import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { InitArguments, TargetPlatform } from '../types.js';
import { detectPackageManager, type PackageManagerType } from './pm-detector.js';
import { patchReactNativeConfig } from './rn-config-patcher.js';
import { generateJjinppangConfig } from './bun-config-gen.js';
import { setupOxc } from './oxc-setup.js';
import { updatePackageJson } from './pkg-updater.js';
import { runInstall, runPodInstall } from './installer.js';
import { generateProjectFromTemplate } from './template-generator.js';
import { setupRedux } from './redux-setup.js';
import { setupWebview } from './webview-setup.js';
import { setupMonorepo, linkMonorepoPackage } from './monorepo-setup.js';
import { setupNextjs } from './next-setup.js';

export interface InitResult {
  mode: 'existing' | 'new';
  projectDir: string;
  packageManager: PackageManagerType;
  platforms: TargetPlatform[];
  patchedRnConfig: boolean;
  createdBunConfig: boolean;
  configuredOxc: boolean;
  configuredRedux?: boolean;
  configuredWebview?: boolean;
  configuredMonorepo?: boolean;
  configuredNext?: boolean;
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
 * Fetches the latest package metadata from npm registry with a short timeout.
 */
export async function fetchNpmPackageLatest(
  pkgName: string,
  timeoutMs = 2000
): Promise<{ version: string; peerDependencies?: Record<string, string> } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://registry.npmjs.org/${pkgName}/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as {
      version: string;
      peerDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

/**
 * Dynamically resolves the highest compatible React Native version for the selected platforms
 * by querying the latest npm package releases and their peerDependencies.
 * - If macos is selected: queries react-native-macos latest peerDependency for react-native
 * - If windows is selected: queries react-native-windows latest peerDependency for react-native
 * - If only mobile (ios, android): returns undefined (defaults to latest React Native)
 */
export async function resolveCompatibleReactNativeVersion(
  platforms: TargetPlatform[]
): Promise<string | undefined> {
  if (platforms.includes('macos')) {
    const macosInfo = await fetchNpmPackageLatest('react-native-macos');
    const peerRn = macosInfo?.peerDependencies?.['react-native'];
    if (peerRn) {
      return peerRn.replace(/^[\^~>=< ]+/, '');
    }
    return '0.81.6'; // safe offline fallback
  }

  if (platforms.includes('windows')) {
    const windowsInfo = await fetchNpmPackageLatest('react-native-windows');
    const peerRn = windowsInfo?.peerDependencies?.['react-native'];
    if (peerRn) {
      return peerRn.replace(/^[\^~>=< ]+/, '');
    }
    return '0.84.1'; // safe offline fallback
  }

  return undefined;
}

/**
 * Configure an existing React Native project
 */
export async function initExistingProject(
  projectDir: string,
  options: InitArguments
): Promise<InitResult> {
  console.log(`\n⚡ [jjinppang] Configuring existing React Native project...`);
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
      `  ✅ Patched ${path.relative(projectDir, rnConfigRes.file)} to include jjinppang commands`
    );
  } else {
    console.log(
      `  ℹ️ ${path.relative(projectDir, rnConfigRes.file)} already contains jjinppang commands`
    );
  }

  // 2. Generate jjinppang.config.js
  const bunConfigRes = generateJjinppangConfig(projectDir, initialPkg, dryRun, options.force);
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
  // 5. Setup Redux Toolkit if requested
  if (options.redux) {
    const projectName = path.basename(projectDir);
    await setupRedux(projectDir, projectName, dryRun);
    console.log(`  ✅ Configured Redux Toolkit (@reduxjs/toolkit & react-redux)`);
  }

  // 6. Setup React Native WebView if requested
  if (options.webview) {
    const projectName = path.basename(projectDir);
    await setupWebview(projectDir, projectName, dryRun, Boolean(options.redux));
    console.log(`  ✅ Configured React Native WebView (react-native-webview)`);
  }

  // 7. Setup Monorepo workspace if requested
  if (options.monorepo || options.next) {
    const projectName = path.basename(projectDir);
    setupMonorepo(projectDir, projectName, dryRun);
    console.log(`  ✅ Configured Monorepo Workspace (packages/ui)`);
  }

  // 8. Setup Next.js web app if requested
  if (options.next) {
    const projectName = path.basename(projectDir);
    await setupNextjs(projectDir, projectName, dryRun);
    console.log(`  ✅ Configured Universal Next.js Web app (apps/web)`);
  }

  // 9. Run install if not skipped and not dry-run
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
    configuredRedux: Boolean(options.redux),
    configuredWebview: Boolean(options.webview),
    configuredMonorepo: Boolean(options.monorepo || options.next),
    configuredNext: Boolean(options.next),
    installedDependencies: installed,
  };
}

/**
 * Scaffolds a new React Native project and then configures jjinppang
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

  console.log(`\n🚀 [jjinppang] Scaffolding new React Native project: ${projectName}...`);

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
      configuredRedux: Boolean(options.redux),
      configuredWebview: Boolean(options.webview),
      configuredMonorepo: Boolean(options.monorepo || options.next),
      configuredNext: Boolean(options.next),
      installedDependencies: false,
    };
  }

  const isMonorepo = Boolean(options.monorepo || options.next);
  const appTargetDir = isMonorepo ? path.join(projectDir, 'apps/mobile') : projectDir;
  const appName = isMonorepo ? 'mobile' : projectName;

  if (isMonorepo && !dryRun) {
    console.log(`🏛️ Setting up Bun workspace monorepo at ${projectDir}...`);
    fs.mkdirSync(projectDir, { recursive: true });

    // Root workspace package.json
    const rootPkg = {
      name: `${projectName.toLowerCase()}-workspace`,
      private: true,
      workspaces: ['apps/*', 'packages/*'],
      scripts: {
        start: 'jjinppang start --projectRoot apps/mobile',
        ios: 'bun --filter mobile ios',
        android: 'bun --filter mobile android',
        'bundle:ios': 'bun --filter mobile bundle:ios',
        'bundle:android': 'bun --filter mobile bundle:android',
        lint: 'oxlint',
        format: 'oxfmt',
        check: 'oxlint && oxfmt --check && bun test',
      },
      devDependencies: {
        oxlint: '^1.82.0',
        oxfmt: '^0.67.0',
        typescript: '^5.0.0',
      },
    };
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify(rootPkg, null, 2) + '\n',
      'utf8'
    );

    // Root .gitignore
    const gitignoreContent = `node_modules/
dist/
.jjinppang-temp/
*.log
*.bundle
*.jsbundle
*.hbc
.DS_Store
`;
    fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignoreContent, 'utf8');

    // Setup root OXC
    setupOxc(projectDir, dryRun, options.force);

    // Setup packages/ui
    setupMonorepo(projectDir, projectName, dryRun);

    // Setup Next.js universal web app if requested
    if (options.next) {
      await setupNextjs(projectDir, projectName, dryRun);
      console.log(`  ✅ Configured Universal Next.js Web app (apps/web)`);
    }
  }

  // 1. Scaffold clean native React Native structure with jjinppang built-in template
  console.log(`⚡ Generating clean project structure with jjinppang built-in template...`);
  const platforms = parsePlatforms(options.platforms);
  const pm = (options.pm as PackageManagerType) || 'bun';
  const rnVersion = options.version || (await resolveCompatibleReactNativeVersion(platforms));

  await generateProjectFromTemplate({
    projectName: appName,
    targetDir: appTargetDir,
    platforms,
    pm,
    templateName: options.template || 'default',
    dryRun,
    force: options.force,
    oxc: !isMonorepo && options.oxc !== false,
    redux: Boolean(options.redux),
    webview: Boolean(options.webview),
    monorepo: isMonorepo,
    rnVersion,
  });

  if (isMonorepo && !dryRun) {
    linkMonorepoPackage(appTargetDir, projectName, dryRun);
  }

  // 2. Install packages (run at workspace root so all packages are linked)
  let installed = false;
  if (!options.skipInstall && !dryRun) {
    installed = runInstall(projectDir, pm);
  }

  // 3. Scaffold macOS native files if macos is targeted and macos/ does not exist
  if (platforms.includes('macos')) {
    const macosDir = path.join(appTargetDir, 'macos');
    if (!fs.existsSync(macosDir)) {
      if (process.platform !== 'darwin') {
        console.log(
          `\nℹ️ [jjinppang] macOS native project scaffolding requires macOS (Darwin).\n` +
            `   Your jjinppang scripts are configured for macOS. To generate the macos/ directory, run 'npx react-native-macos-init' on a Mac.`
        );
      } else {
        console.log(`\n🍏 Scaffolding macOS native project...`);
        const candidatePaths = [
          path.join(
            appTargetDir,
            'node_modules',
            'react-native-macos',
            'local-cli',
            'generate-macos.js'
          ),
          path.join(
            projectDir,
            'node_modules',
            'react-native-macos',
            'local-cli',
            'generate-macos.js'
          ),
        ];
        const localGenerator = candidatePaths.find((p) => fs.existsSync(p));
        let scaffolded = false;

        // 1. Prefer direct generator execution if react-native-macos is installed in node_modules.
        // This avoids `react-native-macos-init` running `npm config get registry` which fatally crashes
        // with ENOWORKSPACES in npm/yarn/bun monorepo workspaces.
        if (localGenerator && fs.existsSync(localGenerator)) {
          try {
            const nodeScript = `const gen = require(${JSON.stringify(localGenerator)}); gen(${JSON.stringify(appTargetDir)}, ${JSON.stringify(appName)}, { overwrite: true });`;
            const genRes = spawnSync('node', ['-e', nodeScript], {
              cwd: appTargetDir,
              stdio: 'inherit',
            });
            if (genRes.status === 0 && fs.existsSync(macosDir)) {
              scaffolded = true;
            }
          } catch {
            // fallback to npx
          }
        }

        // 2. Fallback to npx react-native-macos-init if local generator was not found or failed
        if (!scaffolded) {
          const pkgJsonPath = path.join(appTargetDir, 'package.json');
          let originalDeps: Record<string, string> = {};
          let originalDevDeps: Record<string, string> = {};
          if (fs.existsSync(pkgJsonPath)) {
            try {
              const currentPkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
              originalDeps = { ...currentPkg.dependencies };
              originalDevDeps = { ...currentPkg.devDependencies };
            } catch {
              // ignore
            }
          }

          const res = spawnSync('npx', ['--yes', 'react-native-macos-init'], {
            cwd: appTargetDir,
            stdio: 'inherit',
            shell: true,
          });

          // react-native-macos-init may rewrite react-native & @react-native/* with invalid/unmatched version strings.
          // Restore the project's valid dependencies to prevent broken package resolution.
          if (fs.existsSync(pkgJsonPath)) {
            try {
              const updatedPkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
              let fixed = false;
              for (const key of ['react-native', '@react-native/new-app-screen']) {
                if (originalDeps[key] && updatedPkg.dependencies?.[key] !== originalDeps[key]) {
                  updatedPkg.dependencies[key] = originalDeps[key];
                  fixed = true;
                }
              }
              for (const [key, val] of Object.entries(originalDevDeps)) {
                if (key.startsWith('@react-native/') && updatedPkg.devDependencies?.[key] !== val) {
                  updatedPkg.devDependencies[key] = val;
                  fixed = true;
                }
              }
              if (fixed) {
                fs.writeFileSync(pkgJsonPath, JSON.stringify(updatedPkg, null, 2) + '\n', 'utf8');
              }
            } catch {
              // ignore
            }
          }

          if (res.status !== 0) {
            console.warn(
              `\n⚠️ macOS scaffolding completed with warnings/errors. You can review and configure macOS native files manually.`
            );
          }
        }
      }
    }
  }

  // 4. Scaffold Windows native files if windows is targeted and windows/ does not exist
  if (platforms.includes('windows')) {
    const windowsDir = path.join(appTargetDir, 'windows');
    if (!fs.existsSync(windowsDir)) {
      if (process.platform !== 'win32') {
        console.log(
          `\nℹ️ [jjinppang] Windows native scaffolding (react-native-windows-init) requires a Windows host environment.\n` +
            `   Your jjinppang scripts and package.json are configured for Windows.\n` +
            `   To generate native windows/ files, run 'npx react-native-windows-init' on a Windows machine.`
        );
      } else {
        console.log(`\n🪟 Scaffolding Windows native project (react-native-windows-init)...`);
        const res = spawnSync('npx', ['--yes', 'react-native-windows-init', '--overwrite'], {
          cwd: appTargetDir,
          stdio: 'inherit',
          shell: true,
        });
        if (res.status !== 0) {
          console.warn(
            `\n⚠️ react-native-windows-init completed with warnings/errors. You can review and configure Windows native files manually.`
          );
        }
      }
    }
  }

  // 5. Run CocoaPods on macOS (handles both ios/ and macos/)
  if (process.platform === 'darwin' && !options.skipPods && !options.skipInstall) {
    runPodInstall(appTargetDir);
  }

  return {
    mode: 'new',
    projectDir,
    packageManager: pm,
    platforms,
    patchedRnConfig: true,
    createdBunConfig: true,
    configuredOxc: options.oxc !== false,
    configuredRedux: Boolean(options.redux),
    configuredWebview: Boolean(options.webview),
    configuredMonorepo: isMonorepo,
    configuredNext: Boolean(options.next),
    installedDependencies: installed,
  };
}
