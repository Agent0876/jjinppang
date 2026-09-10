import fs from 'node:fs';
import path from 'node:path';
import type { CliConfig, InitArguments, TargetPlatform } from '../types.js';
import {
  type InitResult,
  initExistingProject,
  initNewProject,
  detectPackageManager,
} from '../scaffold/index.js';
import {
  promptConfirm,
  promptMultiSelect,
  promptSelect,
  promptText,
  renderHeader,
} from '../ui/index.js';

export * from '../scaffold/index.js';

/**
 * Success summary banner printed after initialization
 */
function printSuccessBanner(result: InitResult): void {
  const isNew = result.mode === 'new';
  const pm = result.packageManager;
  const pmRun = pm === 'npm' ? 'npm run' : pm;
  const platforms = result.platforms || ['ios', 'android'];

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  ✨ React Native Bun Build successfully initialized! ⚡     │
└─────────────────────────────────────────────────────────────┘

📁 Location: ${result.projectDir}
🛠️ Package Manager: ${result.packageManager}
📱 Target Platforms: ${platforms.join(', ')}
`);

  const runCommands = platforms.map((p) => `  • ${pmRun} ${p}`).join('\n');
  const bundleCommands = platforms.map((p) => `  • ${pmRun} bundle:${p}`).join('\n');

  if (isNew) {
    const dirName = path.basename(result.projectDir);
    console.log(`To get started with your new app:
  1. cd ${dirName}
  2. ${pmRun} start               # Start fast Bun Dev Server (bun-rn start)
${runCommands}
  • ${pmRun} check                # Check linter, formatter & tests
`);
  } else {
    console.log(`Your project is now configured with react-native-bun-build!
  • Dev Server: ${pmRun} start (bun-rn start)
${runCommands}
  • Fast Release Bundles:
${bundleCommands}
  • Code Quality & Test:
  • ${pmRun} lint (bun-rn lint)
  • ${pmRun} format (bun-rn format)
  • ${pmRun} test (bun-rn test)
  • ${pmRun} check (bun-rn lint + format + test)
`);
  }
}

/**
 * CLI Command Handler for bun-rn init
 */
export async function initCommand(
  argv: string[],
  config: CliConfig,
  args: InitArguments
): Promise<void> {
  const currentDir = config.root || process.cwd();
  let projectName = args.projectName;
  if (!projectName) {
    const flagsWithValues = new Set(['--platforms', '-p', '--pm', '--template', '--config', '-c']);
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (flagsWithValues.has(arg)) {
        i++; // skip option value
        continue;
      }
      if (arg.startsWith('-')) continue;
      if (arg === 'init' || arg === 'bun-init') continue;
      projectName = arg;
      break;
    }
  }

  const isInteractive = Boolean(process.stdin.isTTY && !process.env.CI);

  const hasPlatformsFlag =
    argv.some((a) => a.startsWith('--platforms')) ||
    (Array.isArray(args.platforms) && args.platforms.length > 0) ||
    (typeof args.platforms === 'string' && args.platforms.length > 0);

  const hasPmFlag = argv.some((a) => a.startsWith('--pm')) || Boolean(args.pm);
  const hasOxcFlag = argv.some((a) => a.startsWith('--oxc') || a.startsWith('--no-oxc'));
  const hasSkipInstallFlag = argv.some(
    (a) => a.includes('skip-install') || a.includes('skipInstall')
  );
  const hasSkipPodsFlag = argv.some((a) => a.includes('skip-pods') || a.includes('skipPods'));
  const hasExistingFlag = Boolean(args.existing) || argv.includes('--existing');

  // Check if current directory has a package.json
  const currentPkgPath = path.join(currentDir, 'package.json');
  const hasCurrentPkg = fs.existsSync(currentPkgPath);
  let isExistingMode = hasExistingFlag || (!projectName && hasCurrentPkg);

  if (isInteractive) {
    renderHeader();

    // 1. Project Location / Mode
    if (!projectName && !hasExistingFlag) {
      if (hasCurrentPkg) {
        const currentDirName = path.basename(currentDir);
        const mode = await promptSelect('Where would you like to initialize?', [
          {
            label: `Current directory (${currentDirName})`,
            value: 'existing',
            hint: 'Configure react-native-bun-build in this existing directory',
          },
          {
            label: 'New project in a subfolder',
            value: 'new',
            hint: 'Create a new React Native project',
          },
        ]);
        isExistingMode = mode === 'existing';
      } else {
        isExistingMode = false;
      }

      if (!isExistingMode) {
        projectName = await promptText('Enter your project name', 'MyAwesomeApp');
      }
    }

    // 2. Target Platforms (Spacebar Multi-Select)
    if (!hasPlatformsFlag) {
      args.platforms = await promptMultiSelect<TargetPlatform>(
        'Which platforms will you develop for?',
        [
          { label: 'iOS', value: 'ios', hint: 'Apple iOS (iPhone & iPad)', selected: true },
          { label: 'Android', value: 'android', hint: 'Google Android', selected: true },
          {
            label: 'macOS',
            value: 'macos',
            hint: 'Native macOS Desktop (react-native-macos)',
            selected: false,
          },
          {
            label: 'Windows',
            value: 'windows',
            hint: 'Native Windows Desktop (react-native-windows)',
            selected: false,
          },
        ]
      );
    }

    // 3. Package Manager Selection
    if (!hasPmFlag) {
      const detectedPm = detectPackageManager(currentDir);
      const pmOptions = [
        { label: 'bun', value: 'bun' as const, hint: 'Ultra-fast native runtime (recommended)' },
        { label: 'pnpm', value: 'pnpm' as const, hint: 'Fast, disk space efficient' },
        { label: 'yarn', value: 'yarn' as const, hint: 'Classic or Modern Yarn' },
        { label: 'npm', value: 'npm' as const, hint: 'Standard Node package manager' },
      ];
      const defaultIdx = pmOptions.findIndex((o) => o.value === detectedPm);
      args.pm = await promptSelect(
        'Select your package manager',
        pmOptions,
        defaultIdx !== -1 ? defaultIdx : 0
      );
    }

    // 4. OXC Setup (oxlint & oxfmt)
    if (!hasOxcFlag) {
      args.oxc = await promptConfirm(
        'Configure OXC (oxlint & oxfmt) for ultra-fast linting and formatting?',
        true
      );
    }

    // 5. Install Dependencies Now?
    if (!hasSkipInstallFlag) {
      const pmToUse = args.pm || detectPackageManager(currentDir);
      const installNow = await promptConfirm(`Install dependencies with ${pmToUse} now?`, true);
      args.skipInstall = !installNow;
    }

    // 6. CocoaPods (for Apple platforms on macOS)
    const chosenPlatforms = Array.isArray(args.platforms)
      ? args.platforms
      : String(args.platforms || 'ios,android').split(',');
    const hasApplePlatform =
      chosenPlatforms.includes('ios') ||
      chosenPlatforms.includes('macos') ||
      chosenPlatforms.includes('all');

    if (
      process.platform === 'darwin' &&
      hasApplePlatform &&
      !hasSkipPodsFlag &&
      !args.skipInstall
    ) {
      const runPods = await promptConfirm(
        'Run CocoaPods (pod install) for iOS/macOS dependencies now?',
        false
      );
      args.skipPods = !runPods;
    }
  }

  // Smart defaults for any remaining unspecified values
  args.pm = args.pm || detectPackageManager(currentDir);
  args.oxc = args.oxc ?? true;
  args.skipPods = args.skipPods ?? true;
  args.platforms = args.platforms || ['ios', 'android'];

  let result: InitResult;

  if (isExistingMode || (!projectName && hasCurrentPkg)) {
    args.force = true;
    result = await initExistingProject(currentDir, args);
  } else {
    const finalProjectName = projectName || 'MyAwesomeApp';
    result = await initNewProject(finalProjectName, currentDir, args);
  }

  printSuccessBanner(result);
}
