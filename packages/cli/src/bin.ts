import { parseArgs } from 'node:util';
import { bundleCommand } from './commands/bundle.js';
import type { BundleArguments } from './types.js';

export async function runCli(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  // If first argument is 'bundle' or 'bun-bundle', consume it
  const commandName = rawArgs[0];
  const argsToParse = commandName === 'bundle' || commandName === 'bun-bundle'
    ? rawArgs.slice(1)
    : rawArgs;

  const { values, positionals } = parseArgs({
    args: argsToParse,
    options: {
      'entry-file': { type: 'string' },
      platform: { type: 'string', default: 'ios' },
      dev: { type: 'string', default: 'true' },
      minify: { type: 'string' },
      'bundle-output': { type: 'string' },
      'bundle-encoding': { type: 'string', default: 'utf8' },
      'sourcemap-output': { type: 'string' },
      'sourcemap-sources-root': { type: 'string' },
      'assets-dest': { type: 'string' },
      'reset-cache': { type: 'boolean', default: false },
      config: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.version) {
    console.log(`react-native-bun-build v0.1.0`);
    process.exit(0);
  }

  if (values.help || (!values['entry-file'] && !values['bundle-output'] && positionals.length === 0)) {
    console.log(`
Usage: bun-rn bundle [options]

Ultra-fast custom bundler CLI for React Native bare projects powered by Bun.

Options:
  --entry-file <path>             Path to root JS/TS file (e.g. index.js)
  --platform <string>             Target platform ("ios" or "android", default: "ios")
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
    platform: (values.platform as 'ios' | 'android') || 'ios',
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
