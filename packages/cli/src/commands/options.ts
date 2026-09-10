import type { CommandOption } from '../types.js';

export const bundleCommandOptions: CommandOption[] = [
  {
    name: '--entry-file <path>',
    description: 'Path to the root JavaScript entry file',
  },
  {
    name: '--platform <string>',
    description: 'Target platform ("ios", "android", "macos", or "windows")',
    default: 'ios',
  },
  {
    name: '--dev [boolean]',
    description: 'If false, warnings are disabled and the bundle is minified',
    parse: (val: string) => val === 'true' || val === (true as unknown as string),
    default: true,
  },
  {
    name: '--minify [boolean]',
    description: 'Allows overriding whether bundle is minified',
    parse: (val: string) => val === 'true' || val === (true as unknown as string),
  },
  {
    name: '--bundle-output <path>',
    description: 'File name where to store the resulting bundle',
  },
  {
    name: '--bundle-encoding <string>',
    description: 'Encoding the bundle should be written in (default: "utf8")',
    default: 'utf8',
  },
  {
    name: '--max-workers <number>',
    description: 'Specifies the maximum number of workers',
    parse: (val: string) => Number(val),
  },
  {
    name: '--sourcemap-output <path>',
    description: 'File name where to store the sourcemap file for resulting bundle',
  },
  {
    name: '--sourcemap-sources-root <path>',
    description: 'Path to use when generating paths in the sourcemap',
  },
  {
    name: '--sourcemap-use-absolute-path',
    description: 'Report SourceMapURL using its full path',
  },
  {
    name: '--assets-dest <path>',
    description: 'Directory name where to store assets referenced in the bundle',
  },
  {
    name: '--reset-cache, --resetCache',
    description: 'Removes cached files',
  },
  {
    name: '--config <path>',
    description: 'Path to the CLI configuration file',
  },
];

export const bundleParseArgsConfig = {
  'entry-file': { type: 'string' as const },
  platform: { type: 'string' as const, default: 'ios' },
  dev: { type: 'string' as const, default: 'true' },
  minify: { type: 'string' as const },
  'bundle-output': { type: 'string' as const },
  'bundle-encoding': { type: 'string' as const, default: 'utf8' },
  'sourcemap-output': { type: 'string' as const },
  'sourcemap-sources-root': { type: 'string' as const },
  'assets-dest': { type: 'string' as const },
  'reset-cache': { type: 'boolean' as const, default: false },
  config: { type: 'string' as const },
  help: { type: 'boolean' as const, short: 'h', default: false },
};

export const startCommandOptions: CommandOption[] = [
  {
    name: '--port <number>',
    description: 'Port to listen on',
    parse: (val: string) => Number(val),
    default: 8081,
  },
  {
    name: '--host <string>',
    description: 'Host to listen on',
    default: 'localhost',
  },
  {
    name: '--reset-cache, --resetCache',
    description: 'Removes cached files',
  },
  {
    name: '--config <path>',
    description: 'Path to the CLI configuration file',
  },
  {
    name: '--projectRoot <path>',
    description: 'Path to the root of the project',
  },
];

export const startParseArgsConfig = {
  port: { type: 'string' as const, default: '8081' },
  host: { type: 'string' as const, default: 'localhost' },
  'reset-cache': { type: 'boolean' as const, default: false },
  resetCache: { type: 'boolean' as const, default: false },
  config: { type: 'string' as const },
  projectRoot: { type: 'string' as const },
  help: { type: 'boolean' as const, short: 'h', default: false },
};

export const initCommandOptions: CommandOption[] = [
  {
    name: '--existing',
    description: 'Configure react-native-bun-build in current existing React Native project',
    default: false,
  },
  {
    name: '--pm <string>',
    description: 'Package manager to use (bun, npm, yarn, pnpm)',
  },
  {
    name: '--skip-install',
    description: 'Skip installing dependencies',
    default: false,
  },
  {
    name: '--skip-pods',
    description: 'Skip CocoaPods pod install on macOS/iOS',
    default: false,
  },
  {
    name: '--template <string>',
    description: 'Custom React Native template to use for new project creation',
  },
  {
    name: '--oxc [boolean]',
    description: 'Configure OXC (oxlint & oxfmt) for ultra-fast linting and formatting',
    default: true,
  },
  {
    name: '--dry-run',
    description: 'Display changes that would be made without modifying files',
    default: false,
  },
  {
    name: '--force',
    description: 'Force overwrite existing configuration files',
    default: false,
  },
];

export const initParseArgsConfig = {
  existing: { type: 'boolean' as const, default: false },
  pm: { type: 'string' as const },
  'skip-install': { type: 'boolean' as const, default: false },
  skipInstall: { type: 'boolean' as const, default: false },
  'skip-pods': { type: 'boolean' as const, default: false },
  skipPods: { type: 'boolean' as const, default: false },
  template: { type: 'string' as const },
  oxc: { type: 'string' as const, default: 'true' },
  'dry-run': { type: 'boolean' as const, default: false },
  dryRun: { type: 'boolean' as const, default: false },
  force: { type: 'boolean' as const, default: false },
  help: { type: 'boolean' as const, short: 'h', default: false },
};
