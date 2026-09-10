import path from 'node:path';
import type { CliConfig, InitArguments, TargetPlatform } from '../types.js';
import {
  type InitResult,
  initExistingProject,
  initNewProject,
  detectPackageManager,
} from '../scaffold/index.js';
import { promptMultiSelect, renderHeader } from '../ui/index.js';

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
  const projectName =
    args.projectName || argv.find((a) => !a.startsWith('-') && a !== 'init' && a !== 'bun-init');

  // Interactive Platform Selection if platforms wasn't specified and terminal is interactive
  const isInteractive = !args.platforms && Boolean(process.stdin.isTTY && !process.env.CI);

  if (isInteractive) {
    renderHeader();

    // The ONLY question asked: platforms via Spacebar multi-select
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

  // Automatic smart defaults - nothing else asked!
  args.pm = args.pm || detectPackageManager(currentDir);
  args.oxc = args.oxc ?? true;
  args.skipPods = args.skipPods ?? true;
  args.platforms = args.platforms || ['ios', 'android'];

  let result: InitResult;

  if (projectName) {
    result = await initNewProject(projectName, currentDir, args);
  } else {
    // If no project name specified, configure current directory
    args.force = true;
    result = await initExistingProject(currentDir, args);
  }

  printSuccessBanner(result);
}
