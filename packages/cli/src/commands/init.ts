import fs from 'node:fs';
import path from 'node:path';
import type { CliConfig, InitArguments, TargetPlatform } from '../types.js';
import {
  type InitResult,
  initExistingProject,
  initNewProject,
  detectPackageManager,
  resolveCompatibleReactNativeVersion,
} from '../scaffold/index.js';
import {
  colors,
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

  const stateMgmt = result.configuredRedux
    ? '\n📦 State Management: Redux Toolkit (@reduxjs/toolkit)'
    : '';
  const webviewInfo = result.configuredWebview
    ? '\n🌐 In-App Browser: React Native WebView (react-native-webview)'
    : '';
  const monorepoInfo = result.configuredMonorepo
    ? '\n🏛️ Workspace: Bun Monorepo (apps/mobile + packages/ui)'
    : '';
  const nextInfo = result.configuredNext
    ? '\n⚡ Web Framework: Next.js 15 (apps/web) with react-native-web'
    : '';

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  ✨ 찐빵 (jjinppang) successfully initialized! 🥟           │
└─────────────────────────────────────────────────────────────┘

📁 Location: ${result.projectDir}
🛠️ Package Manager: ${result.packageManager}
📱 Target Platforms: ${platforms.join(', ')}${stateMgmt}${webviewInfo}${monorepoInfo}${nextInfo}
`);

  const runCommands = platforms.map((p) => `  • ${pmRun} ${p}`).join('\n');
  const bundleCommands = platforms.map((p) => `  • ${pmRun} bundle:${p}`).join('\n');

  if (result.configuredMonorepo) {
    const dirName = path.basename(result.projectDir);
    const webCmd = result.configuredNext
      ? `\n  5. ${pmRun} web                 # Start Next.js web dev server (http://localhost:3000)`
      : '';
    const webAppInfo = result.configuredNext
      ? `\n  • Web App: apps/web (Next.js 15 App Router)`
      : '';
    console.log(`To get started with your Monorepo app:
  1. cd ${dirName}
  2. ${pmRun} start               # Start fast Bun Dev Server for apps/mobile
  3. ${pmRun} ios                 # Run on iOS simulator
  4. ${pmRun} android             # Run on Android emulator${webCmd}
  • Mobile App: apps/mobile
  • Shared UI package: packages/ui (workspace:*)${webAppInfo}
  • Check quality: ${pmRun} check
`);
  } else if (isNew) {
    const dirName = path.basename(result.projectDir);
    console.log(`To get started with your new app:
  1. cd ${dirName}
  2. ${pmRun} start               # Start fast Bun Dev Server (jjinppang start)
${runCommands}
  • ${pmRun} check                # Check linter, formatter & tests
`);
  } else {
    console.log(`Your project is now configured with jjinppang!
  • Dev Server: ${pmRun} start (jjinppang start)
${runCommands}
  • Fast Release Bundles:
${bundleCommands}
  • Code Quality & Test:
  • ${pmRun} lint (jjinppang lint)
  • ${pmRun} format (jjinppang format)
  • ${pmRun} test (jjinppang test)
  • ${pmRun} check (jjinppang lint + format + test)
`);
  }
}

/**
 * CLI Command Handler for jjinppang init
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

  const hasOxcFlag = argv.some((a) => a.startsWith('--oxc') || a.startsWith('--no-oxc'));
  const hasReduxFlag = argv.some(
    (a) => a.startsWith('--redux') || a.startsWith('--no-redux') || a === '-r'
  );
  const hasWebviewFlag = argv.some(
    (a) => a.startsWith('--webview') || a.startsWith('--no-webview') || a === '-w'
  );
  const hasMonorepoFlag = argv.some(
    (a) => a.startsWith('--monorepo') || a.startsWith('--no-monorepo') || a === '-m'
  );
  const hasNextFlag = argv.some(
    (a) =>
      a.startsWith('--next') ||
      a.startsWith('--no-next') ||
      a.startsWith('--nextjs') ||
      a.startsWith('--no-nextjs')
  );
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
            hint: 'Configure here',
          },
          {
            label: 'New project in a subfolder',
            value: 'new',
            hint: 'Create in subfolder',
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

      const selectedPlatforms = Array.isArray(args.platforms)
        ? args.platforms
        : String(args.platforms || 'ios,android').split(',');
      const suggestedVersion = await resolveCompatibleReactNativeVersion(
        selectedPlatforms as TargetPlatform[]
      );
      if (suggestedVersion && !args.version) {
        console.log(
          `\n  ${colors.dim}💡 Selected desktop platforms require React Native ${suggestedVersion} for native compatibility.${colors.reset}`
        );
      }
    }

    // Auto-detect package manager (defaults to bun, no prompt needed)
    args.pm = args.pm || detectPackageManager(currentDir);

    // 4. OXC Setup (oxlint & oxfmt)
    if (!hasOxcFlag && args.oxc === undefined) {
      args.oxc = await promptConfirm(
        'Configure OXC (oxlint & oxfmt) for ultra-fast linting and formatting?',
        true
      );
    }

    // 5. Redux Toolkit Setup (@reduxjs/toolkit & react-redux)
    if (!hasReduxFlag && args.redux === undefined) {
      args.redux = await promptConfirm(
        'Configure Redux Toolkit (@reduxjs/toolkit & react-redux) for state management?',
        false
      );
    }

    // 6. React Native WebView (react-native-webview)
    if (!hasWebviewFlag && args.webview === undefined) {
      args.webview = await promptConfirm(
        'Configure React Native WebView (react-native-webview) for in-app web views?',
        false
      );
    }

    // 7. Monorepo Workspace (apps/ + packages/)
    if (!hasMonorepoFlag && args.monorepo === undefined) {
      args.monorepo = await promptConfirm(
        'Configure project as a modern Monorepo workspace (apps/ + packages/)?',
        false
      );
    }

    // 8. Next.js Universal Web (apps/web)
    if (!hasNextFlag && args.next === undefined) {
      args.next = await promptConfirm(
        'Configure universal Next.js Web app (apps/web) with react-native-web?',
        false
      );
    }
    if (args.next) {
      args.monorepo = true;
    }

    // 9. Install Dependencies Now?
    if (!hasSkipInstallFlag) {
      const pmToUse = args.pm || detectPackageManager(currentDir);
      const installNow = await promptConfirm(`Install dependencies with ${pmToUse} now?`, true);
      args.skipInstall = !installNow;
    }

    // 10. CocoaPods (for Apple platforms on macOS)
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
  args.redux = Boolean(args.redux);
  args.webview = Boolean(args.webview);
  args.monorepo = Boolean(args.monorepo || args.next);
  args.next = Boolean(args.next);
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
