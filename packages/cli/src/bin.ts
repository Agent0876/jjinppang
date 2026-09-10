import { parseArgs } from 'node:util';
import { bundleCommand } from './commands/bundle.js';
import { startCommand } from './commands/start.js';
import { initCommand } from './commands/init.js';
import {
  bundleParseArgsConfig,
  initParseArgsConfig,
  startParseArgsConfig,
} from './commands/options.js';
import type { BundleArguments, StartArguments, InitArguments } from './types.js';

export async function runCli(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const commandName = rawArgs[0];

  if (rawArgs.includes('-v') || rawArgs.includes('--version')) {
    console.log(`react-native-bun-build v0.1.0`);
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

// Auto-execute only if bin.ts is invoked directly
// @ts-ignore
if (typeof Bun !== 'undefined' && import.meta.main && process.argv[1]?.endsWith('bin.ts')) {
  runCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
