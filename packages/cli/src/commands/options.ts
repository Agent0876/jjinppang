import type { CommandOption } from '../types.js';

export const bundleCommandOptions: CommandOption[] = [
  {
    name: '--entry-file <path>',
    description: 'Path to the root JavaScript entry file',
  },
  {
    name: '--platform <string>',
    description: 'Either "ios" or "android"',
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
