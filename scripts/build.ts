import path from 'node:path';

interface BuildConfig {
  name: string;
  entrypoints: string[];
  outdir?: string;
  outfile?: string;
  format?: 'esm' | 'cjs';
  target?: 'node' | 'browser' | 'bun';
}

const builds: BuildConfig[] = [
  {
    name: 'core',
    entrypoints: ['packages/core/src/index.ts'],
    outdir: 'packages/core/dist',
    target: 'node',
    format: 'esm',
  },
  {
    name: 'cli',
    entrypoints: ['packages/cli/src/index.ts'],
    outdir: 'packages/cli/dist',
    target: 'node',
    format: 'esm',
  },
  {
    name: 'cli-commands-esm',
    entrypoints: ['packages/cli/src/commands/index.ts'],
    outfile: 'packages/cli/dist/commands/index.js',
    target: 'node',
    format: 'esm',
  },
  {
    name: 'cli-commands-cjs',
    entrypoints: ['packages/cli/src/commands/index.ts'],
    outfile: 'packages/react-native-bun-build/dist/commands.cjs',
    target: 'node',
    format: 'cjs',
  },
  {
    name: 'cli-bin',
    entrypoints: ['packages/cli/src/bin.ts'],
    outfile: 'packages/cli/dist/bin.js',
    target: 'node',
    format: 'esm',
  },
  {
    name: 'react-native-bun-build',
    entrypoints: ['packages/react-native-bun-build/src/index.ts'],
    outdir: 'packages/react-native-bun-build/dist',
    target: 'node',
    format: 'esm',
  },
];

async function runBuild(): Promise<void> {
  const startTime = performance.now();
  console.log('📦 Building react-native-bun-build packages...\n');

  for (const config of builds) {
    const buildStart = performance.now();

    const buildOptions: Parameters<typeof Bun.build>[0] = {
      entrypoints: config.entrypoints,
      target: config.target ?? 'node',
      format: config.format ?? 'esm',
    };

    if (config.outfile) {
      buildOptions.naming = path.basename(config.outfile);
      buildOptions.outdir = path.dirname(config.outfile);
    } else if (config.outdir) {
      buildOptions.outdir = config.outdir;
    }

    const result = await Bun.build(buildOptions);

    if (!result.success) {
      console.error(`❌ Build failed for ${config.name}:`);
      for (const log of result.logs) {
        console.error(log);
      }
      process.exit(1);
    }

    const elapsed = (performance.now() - buildStart).toFixed(1);
    console.log(`  ✓ ${config.name} (${elapsed}ms)`);
  }

  const totalTime = (performance.now() - startTime).toFixed(1);
  console.log(`\n✨ All builds completed successfully in ${totalTime}ms!`);
}

runBuild().catch((err) => {
  console.error('Fatal build error:', err);
  process.exit(1);
});
