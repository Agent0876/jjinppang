import fs from 'node:fs';
import path from 'node:path';
import type { CliConfig, InitArguments } from '../types.js';
import { type InitResult, initExistingProject, initNewProject } from '../scaffold/index.js';

// Re-export all scaffolding utilities for 100% backward compatibility
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
  const projectName =
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

  // Determine mode:
  // If explicitly --existing, or if no projectName given and current directory is RN -> existing project mode.
  // If projectName is provided and not --existing -> new project mode.
  const isExistingMode = Boolean(args.existing) || (!projectName && isCurrentRN);

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
