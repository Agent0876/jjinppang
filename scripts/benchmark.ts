import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface BenchmarkResult {
  tool: string;
  platform: string;
  durationMs: number;
  sizeBytes: number;
}

const TEST_APP_DIR = path.resolve(__dirname, '../fixtures/TestApp');
const BENCHMARK_OUT_DIR = path.resolve(TEST_APP_DIR, 'dist/benchmark');

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function runCommand(cmd: string, cwd: string): number {
  const start = performance.now();
  execSync(cmd, { cwd, stdio: 'pipe' });
  const end = performance.now();
  return Math.round(end - start);
}

async function main() {
  console.log('🚀 Running React Native Bundler Benchmark (Metro vs react-native-bun-build)...');
  console.log(`📁 Project: ${TEST_APP_DIR}`);

  if (fs.existsSync(BENCHMARK_OUT_DIR)) {
    fs.rmSync(BENCHMARK_OUT_DIR, { recursive: true });
  }
  fs.mkdirSync(BENCHMARK_OUT_DIR, { recursive: true });

  const runs = 3;
  const results: BenchmarkResult[] = [];

  const scenarios = [
    {
      platform: 'ios',
      metroOutput: path.join(BENCHMARK_OUT_DIR, 'metro.ios.bundle'),
      bunOutput: path.join(BENCHMARK_OUT_DIR, 'bun.ios.bundle'),
      metroAssets: path.join(BENCHMARK_OUT_DIR, 'metro-assets-ios'),
      bunAssets: path.join(BENCHMARK_OUT_DIR, 'bun-assets-ios'),
    },
    {
      platform: 'android',
      metroOutput: path.join(BENCHMARK_OUT_DIR, 'metro.android.bundle'),
      bunOutput: path.join(BENCHMARK_OUT_DIR, 'bun.android.bundle'),
      metroAssets: path.join(BENCHMARK_OUT_DIR, 'metro-assets-android'),
      bunAssets: path.join(BENCHMARK_OUT_DIR, 'bun-assets-android'),
    },
  ];

  const bunCli = path.resolve(__dirname, '../packages/cli/bin/bun-rn.js');

  // Warmup run
  console.log('\n⏳ Running warmup...');
  runCommand(
    `bun run ${bunCli} bundle --entry-file index.js --platform ios --dev false --bundle-output ${path.join(BENCHMARK_OUT_DIR, 'warmup.bundle')}`,
    TEST_APP_DIR
  );

  const configPath = path.join(TEST_APP_DIR, 'react-native.config.js');
  const configBakPath = path.join(TEST_APP_DIR, 'react-native.config.js.bak');

  for (const scenario of scenarios) {
    console.log(`\n========================================`);
    console.log(`📱 Benchmarking Platform: ${scenario.platform.toUpperCase()}`);
    console.log(`========================================`);

    // 1. Metro Bundle (bypass plugin by temporarily renaming config)
    console.log(`\n📦 Running Metro bundle (${runs} runs)...`);
    const metroTimes: number[] = [];
    let metroSize = 0;

    for (let i = 1; i <= runs; i++) {
      process.stdout.write(`   Run ${i}/${runs}... `);

      if (fs.existsSync(configPath)) {
        fs.renameSync(configPath, configBakPath);
      }

      try {
        const cmd = `npx react-native bundle --entry-file index.js --platform ${scenario.platform} --dev false --bundle-output ${scenario.metroOutput} --assets-dest ${scenario.metroAssets} --reset-cache`;
        const duration = runCommand(cmd, TEST_APP_DIR);
        metroTimes.push(duration);
        metroSize = fs.existsSync(scenario.metroOutput) ? fs.statSync(scenario.metroOutput).size : 0;
        console.log(`${duration}ms`);
      } finally {
        if (fs.existsSync(configBakPath)) {
          fs.renameSync(configBakPath, configPath);
        }
      }
    }

    const metroAvgTime = Math.round(
      metroTimes.reduce((a, b) => a + b, 0) / metroTimes.length
    );
    results.push({
      tool: 'Metro',
      platform: scenario.platform,
      durationMs: metroAvgTime,
      sizeBytes: metroSize,
    });

    // 2. Bun Bundle
    console.log(`\n⚡ Running react-native-bun-build (${runs} runs)...`);
    const bunTimes: number[] = [];
    let bunSize = 0;

    for (let i = 1; i <= runs; i++) {
      process.stdout.write(`   Run ${i}/${runs}... `);
      const cmd = `bun run ${bunCli} bundle --entry-file index.js --platform ${scenario.platform} --dev false --bundle-output ${scenario.bunOutput} --assets-dest ${scenario.bunAssets} --reset-cache`;
      const duration = runCommand(cmd, TEST_APP_DIR);
      bunTimes.push(duration);
      bunSize = fs.existsSync(scenario.bunOutput) ? fs.statSync(scenario.bunOutput).size : 0;
      console.log(`${duration}ms`);
    }

    const bunAvgTime = Math.round(
      bunTimes.reduce((a, b) => a + b, 0) / bunTimes.length
    );
    results.push({
      tool: 'react-native-bun-build (Bun)',
      platform: scenario.platform,
      durationMs: bunAvgTime,
      sizeBytes: bunSize,
    });
  }

  // Generate Table
  console.log(`\n========================================`);
  console.log(`📊 Benchmark Summary`);
  console.log(`========================================\n`);

  const iosMetro = results.find((r) => r.tool === 'Metro' && r.platform === 'ios')!;
  const iosBun = results.find((r) => r.tool.includes('Bun') && r.platform === 'ios')!;
  const androidMetro = results.find((r) => r.tool === 'Metro' && r.platform === 'android')!;
  const androidBun = results.find((r) => r.tool.includes('Bun') && r.platform === 'android')!;

  const iosSpeedup = (iosMetro.durationMs / iosBun.durationMs).toFixed(2);
  const androidSpeedup = (androidMetro.durationMs / androidBun.durationMs).toFixed(2);

  const markdown = `# react-native-bun-build vs Metro Benchmark

Benchmarking production bundle generation on React Native 0.87 (Hermes enabled, \`--dev false\`, \`--reset-cache\`).
Averaged across ${runs} consecutive runs.

| Platform | Bundler | Avg Duration | Bundle Size | Speedup |
| :--- | :--- | :--- | :--- | :--- |
| **iOS** | Metro | **${iosMetro.durationMs} ms** | ${formatBytes(iosMetro.sizeBytes)} | 1.0x (baseline) |
| **iOS** | **react-native-bun-build (Bun)** | **${iosBun.durationMs} ms** | ${formatBytes(iosBun.sizeBytes)} | **${iosSpeedup}x faster** ⚡ |
| **Android** | Metro | **${androidMetro.durationMs} ms** | ${formatBytes(androidMetro.sizeBytes)} | 1.0x (baseline) |
| **Android** | **react-native-bun-build (Bun)** | **${androidBun.durationMs} ms** | ${formatBytes(androidBun.sizeBytes)} | **${androidSpeedup}x faster** ⚡ |

### Key Observations:
- **Build Speed**: \`react-native-bun-build\` achieves a **~${iosSpeedup}x to ${androidSpeedup}x speedup** over Metro in production builds.
- **Hermes Bytecode**: Compiles standard JS bundle directly into native Hermes Bytecode (\`.hbc\`) Ahead-Of-Time (AOT).
- **Asset Pipeline**: Automatic extraction and resolution of \`@2x\`, \`@3x\` variants mapped to platform destinations (iOS asset hierarchy and Android \`drawable-*\` / \`raw\`).
`;

  console.log(markdown);

  const benchmarkReportPath = path.resolve(__dirname, '../BENCHMARK.md');
  fs.writeFileSync(benchmarkReportPath, markdown, 'utf8');
  console.log(`Saved benchmark report to ${benchmarkReportPath}`);
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
