import fs from 'node:fs';
import path from 'node:path';
import type { CliConfig, InitArguments } from '../types.js';
import { type InitResult, initExistingProject, initNewProject } from '../scaffold/index.js';
import { promptConfirm, promptSelect, promptText, renderHeader } from '../ui/index.js';

export * from '../scaffold/index.js';

/**
 * Success summary banner printed after initialization
 */
function printSuccessBanner(result: InitResult): void {
  const isNew = result.mode === 'new';
  const pm = result.packageManager;
  const pmRun = pm === 'npm' ? 'npm run' : pm;

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  ✨ React Native Bun Build successfully initialized! ⚡     │
└─────────────────────────────────────────────────────────────┘

📁 Location: ${result.projectDir}
🛠️ Package Manager: ${result.packageManager}
`);

  if (isNew) {
    const dirName = path.basename(result.projectDir);
    console.log(`To get started with your new app:
  1. cd ${dirName}
  2. ${pmRun} start               # Start fast Bun Dev Server
  3. ${pmRun} ios (or android)    # Run on Simulator or Device
`);
  } else {
    console.log(`Your project is now configured with react-native-bun-build!
  • Dev Server: ${pmRun} start (or ${pmRun} start:bun)
  • Fast Release Bundle: ${pmRun} bundle:bun
  • Code Quality: ${pmRun} check (oxlint + oxfmt)
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
  let projectName =
    args.projectName || argv.find((a) => !a.startsWith('-') && a !== 'init' && a !== 'bun-init');

  // Check if current directory has a React Native package.json
  const currentPkgPath = path.join(currentDir, 'package.json');
  const hasCurrentPkg = fs.existsSync(currentPkgPath);
  let isCurrentRN = false;
  if (hasCurrentPkg) {
    try {
      const parsed = JSON.parse(fs.readFileSync(currentPkgPath, 'utf8'));
      isCurrentRN = Boolean(
        parsed.dependencies?.['react-native'] ||
        parsed.devDependencies?.['react-native'] ||
        parsed.dependencies?.['react-native-macos'] ||
        parsed.devDependencies?.['react-native-macos'] ||
        parsed.dependencies?.['react-native-windows'] ||
        parsed.devDependencies?.['react-native-windows']
      );
    } catch {
      // ignore
    }
  }

  // Interactive Wizard if run without arguments in an interactive terminal
  const isInteractive =
    !projectName && !args.existing && Boolean(process.stdin.isTTY && !process.env.CI);

  let isExistingMode = Boolean(args.existing) || (!projectName && isCurrentRN);

  if (isInteractive) {
    renderHeader();

    if (isCurrentRN) {
      const mode = await promptSelect(
        'Detected React Native in current directory. What would you like to do?',
        [
          { label: 'Configure react-native-bun-build in this current project', value: 'existing' },
          { label: 'Create a new React Native project in a subfolder', value: 'new' },
        ]
      );
      isExistingMode = mode === 'existing';
    } else {
      isExistingMode = false;
    }

    if (!isExistingMode) {
      projectName = await promptText('Enter your new project name', 'MyAwesomeApp');
    }

    if (!args.pm) {
      args.pm = await promptSelect('Select your package manager', [
        { label: 'bun', value: 'bun', hint: 'Ultra-fast native runtime (recommended)' },
        { label: 'pnpm', value: 'pnpm', hint: 'Fast, disk space efficient' },
        { label: 'yarn', value: 'yarn', hint: 'Classic or Modern Yarn' },
        { label: 'npm', value: 'npm', hint: 'Standard Node package manager' },
      ]);
    }

    if (args.oxc === undefined) {
      args.oxc = await promptConfirm(
        'Configure OXC (oxlint & oxfmt) for ultra-fast linting and formatting?',
        true
      );
    }

    if (!isExistingMode && process.platform === 'darwin' && args.skipPods === undefined) {
      const installPods = await promptConfirm(
        'Run CocoaPods (pod install) for iOS dependencies now?',
        false
      );
      args.skipPods = !installPods;
    }
  }

  let result: InitResult;

  if (isExistingMode) {
    result = await initExistingProject(currentDir, args);
  } else {
    if (!projectName) {
      console.error(
        `\n❌ Error: Please specify a project name to create, or run inside an existing React Native project.\n` +
          `Usage:\n` +
          `  bun-rn init MyAwesomeApp\n` +
          `  bun-rn init --existing\n`
      );
      process.exit(1);
    }
    result = await initNewProject(projectName, currentDir, args);
  }

  printSuccessBanner(result);
}
