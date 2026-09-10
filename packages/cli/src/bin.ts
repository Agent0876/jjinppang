import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { bundleCommand } from './commands/bundle.js';
import { startCommand } from './commands/start.js';
import { initCommand } from './commands/init.js';
import { lintCommand } from './commands/lint.js';
import { formatCommand } from './commands/format.js';
import {
  bundleParseArgsConfig,
  initParseArgsConfig,
  startParseArgsConfig,
  lintParseArgsConfig,
  formatParseArgsConfig,
} from './commands/options.js';
import type {
  BundleArguments,
  StartArguments,
  InitArguments,
  LintArguments,
  FormatArguments,
} from './types.js';

/**
 * Dynamically resolves the CLI version from package.json
 */
export function getCliVersion(): string {
  try {
    const searchDirs: string[] = [];

    if (process.argv[1]) {
      searchDirs.push(path.dirname(path.resolve(process.argv[1])));
    }

    try {
      searchDirs.push(path.dirname(fileURLToPath(import.meta.url)));
    } catch {
      // ignore
    }

    if (typeof __dirname !== 'undefined') {
      searchDirs.push(__dirname);
    }

    for (const startDir of searchDirs) {
      let curr = startDir;
      for (let i = 0; i < 5; i++) {
        const pkgPath = path.join(curr, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (
              pkg.name === 'react-native-bun-build' ||
              pkg.name === '@react-native-bun-build/cli'
            ) {
              if (pkg.version) return pkg.version;
            }
          } catch {
            // ignore
          }
        }
        const parent = path.dirname(curr);
        if (parent === curr) break;
        curr = parent;
      }
    }
  } catch {
    // fallback
  }

  return '0.1.0';
}

export async function runCli(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const commandName = rawArgs[0];

  if (rawArgs.includes('-v') || rawArgs.includes('--version')) {
    const version = getCliVersion();
    console.log(`react-native-bun-build v${version}`);
    process.exit(0);
  }

  // Handle 'init' or 'bun-init' command
  if (commandName === 'init' || commandName === 'bun-init') {
    const argsToParse = rawArgs.slice(1);
    const { values, positionals } = parseArgs({
      args: argsToParse,
      options: initParseArgsConfig,
      allowPositionals: true,
      strict: false,
    });

    if (values.help) {
      console.log(`
Usage: bun-rn init [projectName] [options]

Initializes a new React Native project with Bun or configures an existing project.

Options:
  --existing                      Configure react-native-bun-build in current project
  --pm <bun|npm|yarn|pnpm>        Package manager to use (default: auto-detect)
  --skip-install                  Skip installing dependencies
  --skip-pods                     Skip CocoaPods pod install on macOS/iOS
  --template <name>               Template to use for new project creation
  --oxc <boolean>                 Configure OXC (oxlint & oxfmt) (default: true)
  --dry-run                       Display planned changes without writing files
  --force                         Force overwrite existing configuration files
  -h, --help                      Show help
      `);
      process.exit(0);
    }

    const initArgs: InitArguments = {
      projectName: positionals[0],
      existing: Boolean(values.existing),
      pm: values.pm as 'bun' | 'npm' | 'yarn' | 'pnpm' | undefined,
      skipInstall: Boolean(values['skip-install'] || values.skipInstall),
      skipPods: Boolean(values['skip-pods'] || values.skipPods),
      template: values.template as string | undefined,
      oxc: values.oxc !== 'false' && (values.oxc as unknown) !== false,
      dryRun: Boolean(values['dry-run'] || values.dryRun),
      force: Boolean(values.force),
    };

    await initCommand(rawArgs, { root: process.cwd() }, initArgs);
    return;
  }

  // Handle 'start' or 'bun-start' command
  if (commandName === 'start' || commandName === 'bun-start') {
    const argsToParse = rawArgs.slice(1);
    const { values } = parseArgs({
      args: argsToParse,
      options: startParseArgsConfig,
      allowPositionals: true,
      strict: false,
    });

    if (values.help) {
      console.log(`
Usage: bun-rn start [options]

Starts the React Native development server powered by Bun.serve.

Options:
  --port <number>                 Port to listen on (default: 8081)
  --host <string>                 Host to listen on (default: "localhost")
  --reset-cache                   Clears in-memory bundle cache
  --config <path>                 Path to custom configuration file
  --projectRoot <path>            Path to project root (default: current directory)
  -h, --help                      Show help
      `);
      process.exit(0);
    }

    const startArgs: StartArguments = {
      port: values.port ? Number(values.port) : 8081,
      host: (values.host as string) || 'localhost',
      resetCache: Boolean(values['reset-cache'] || values.resetCache),
      config: values.config as string | undefined,
      projectRoot: values.projectRoot as string | undefined,
    };

    await startCommand(rawArgs, { root: process.cwd() }, startArgs);
    return;
  }

  // Handle 'lint' or 'bun-lint' command
  if (commandName === 'lint' || commandName === 'bun-lint') {
    const argsToParse = rawArgs.slice(1);
    const { values, positionals } = parseArgs({
      args: argsToParse,
      options: lintParseArgsConfig,
      allowPositionals: true,
      strict: false,
    });

    if (values.help) {
      console.log(`
Usage: bun-rn lint [dir] [options]

Runs ultra-fast linter powered by OXC (oxlint) for React Native with zero config.

Options:
  --fix                           Automatically fix lint issues
  -c, --config <path>             Path to custom .oxlintrc.json
  --dir <path>                    Target directory or file (default: .)
  -h, --help                      Show help
      `);
      process.exit(0);
    }

    const lintArgs: LintArguments = {
      fix: Boolean(values.fix),
      config: values.config as string | undefined,
      dir: (values.dir as string | undefined) || positionals[0],
    };

    await lintCommand(rawArgs, { root: process.cwd() }, lintArgs);
    return;
  }

  // Handle 'format' or 'bun-format' command
  if (commandName === 'format' || commandName === 'bun-format') {
    const argsToParse = rawArgs.slice(1);
    const { values, positionals } = parseArgs({
      args: argsToParse,
      options: formatParseArgsConfig,
      allowPositionals: true,
      strict: false,
    });

    if (values.help) {
      console.log(`
Usage: bun-rn format [dir] [options]

Runs ultra-fast code formatter powered by OXC (oxfmt) for React Native with zero config.

Options:
  --check                         Check if files are formatted without writing
  -c, --config <path>             Path to custom .oxfmtrc.json
  --dir <path>                    Target directory or file (default: .)
  -h, --help                      Show help
      `);
      process.exit(0);
    }

    const formatArgs: FormatArguments = {
      check: Boolean(values.check),
      config: values.config as string | undefined,
      dir: (values.dir as string | undefined) || positionals[0],
    };

    await formatCommand(rawArgs, { root: process.cwd() }, formatArgs);
    return;
  }

  // Handle 'test' or 'bun-test' command
  if (commandName === 'test' || commandName === 'bun-test') {
    const testArgs = rawArgs.slice(1);
    if (testArgs.includes('-h') || testArgs.includes('--help')) {
      console.log(`
Usage: bun-rn test [filter] [options]

Runs ultra-fast test suite powered by Bun test for React Native projects.

Options:
  --watch                         Watch files for changes and re-run tests
  --bail                          Exit immediately on first test failure
  --coverage                      Generate code coverage report
  -t, --test-name-pattern <str>   Run only tests matching regex pattern
  -h, --help                      Show help
      `);
      process.exit(0);
    }

    console.log(`\n⚡ [react-native-bun-build] Running tests (bun test)...`);
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync('bun', ['test', ...testArgs], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    process.exit(result.status ?? 0);
  }

  // Check if this is an unknown command
  const isBundle =
    commandName === 'bundle' ||
    commandName === 'bun-bundle' ||
    commandName === undefined ||
    commandName.startsWith('-') ||
    rawArgs.includes('--entry-file') ||
    rawArgs.includes('--bundle-output');

  if (!isBundle) {
    console.error(
      `\n❌ Unknown command "${commandName}".\nRun "bun-rn --help" to see all available commands.\n`
    );
    process.exit(1);
  }

  // Handle 'bundle' or 'bun-bundle' command (or default)
  const argsToParse =
    commandName === 'bundle' || commandName === 'bun-bundle' ? rawArgs.slice(1) : rawArgs;

  const { values, positionals } = parseArgs({
    args: argsToParse,
    options: bundleParseArgsConfig,
    allowPositionals: true,
    strict: false,
  });

  if (
    values.help ||
    (!values['entry-file'] && !values['bundle-output'] && positionals.length === 0)
  ) {
    console.log(`
Usage: bun-rn <command> [options]

Ultra-fast custom bundler CLI for React Native bare projects powered by Bun.

Commands:
  init [name]                     Initialize a new RN project or configure an existing project
  start                           Start development server with HMR / Fast Refresh & Symbolicate
  bundle                          Build offline bundle for release or debug
  lint [dir]                      Run ultra-fast OXC linter (oxlint) with zero config
  format [dir]                    Run ultra-fast OXC formatter (oxfmt) with zero config
  test [filter]                   Run ultra-fast tests powered by Bun test

Bundle Options:
  --entry-file <path>             Path to root JS/TS file (e.g. index.js)
  --platform <string>             Target platform ("ios", "android", "macos", "windows", default: "ios")
  --dev <boolean>                 Development mode (true/false, default: true)
  --minify <boolean>              Explicitly enable/disable minification
  --bundle-output <path>          Path where generated bundle is stored
  --bundle-encoding <string>      Bundle output file encoding (default: "utf8")
  --sourcemap-output <path>       Path where sourcemap is stored
  --assets-dest <path>            Directory where assets will be copied
  --config <path>                 Path to custom configuration file
  -h, --help                      Show help
  -v, --version                   Show version
    `);
    process.exit(0);
  }

  const dev = values.dev === 'false' || values.dev === false ? false : true;
  const minify = values.minify !== undefined ? values.minify === 'true' : undefined;

  const bundleArgs: BundleArguments = {
    entryFile: values['entry-file'] as string,
    platform: (values.platform as 'ios' | 'android' | 'macos' | 'windows') || 'ios',
    dev,
    minify,
    bundleOutput: values['bundle-output'] as string,
    bundleEncoding: (values['bundle-encoding'] as BufferEncoding) || 'utf8',
    sourcemapOutput: values['sourcemap-output'] as string | undefined,
    assetsDest: values['assets-dest'] as string | undefined,
    config: values.config as string | undefined,
    resetCache: Boolean(values['reset-cache']),
  };

  await bundleCommand(rawArgs, { root: process.cwd() }, bundleArgs);
}

// Auto-execute only if bin.ts or bin.js is invoked directly
// @ts-ignore
if (
  typeof Bun !== 'undefined' &&
  import.meta.main &&
  (process.argv[1]?.endsWith('bin.ts') || process.argv[1]?.endsWith('bin.js'))
) {
  runCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
