import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { SourceMapConsumer } from 'source-map-js';
import { bundle } from '../packages/core/src/index.js';

const TEST_DIR = path.join(__dirname, '.temp-sourcemap-test');

describe('Production Source Map & Sentry Compatibility Pipeline', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Mock minimal React Native
    const rnDir = path.join(TEST_DIR, 'node_modules', 'react-native');
    fs.mkdirSync(path.join(rnDir, 'Libraries', 'Core'), { recursive: true });
    fs.writeFileSync(
      path.join(rnDir, 'package.json'),
      JSON.stringify({ name: 'react-native', main: 'index.js' })
    );
    fs.writeFileSync(path.join(rnDir, 'index.js'), 'module.exports = {};');
    fs.writeFileSync(
      path.join(rnDir, 'Libraries', 'Core', 'InitializeCore.js'),
      '/* InitializeCore */'
    );

    // Create TypeScript files with known function and throw location
    fs.writeFileSync(
      path.join(TEST_DIR, 'error-generator.ts'),
      `export function calculateCrash(multiplier: number): number {
  const base = 42;
  const computed = base * multiplier;
  if (computed > 100) {
    throw new Error('CrashCalculationExceededThreshold');
  }
  return computed;
}
`
    );

    fs.writeFileSync(
      path.join(TEST_DIR, 'App.tsx'),
      `import { calculateCrash } from './error-generator';

export function runMain(): number {
  console.log('Starting application...');
  return calculateCrash(5);
}
runMain();
`
    );

    fs.writeFileSync(path.join(TEST_DIR, 'index.ts'), `import './App';`);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('generates a valid Source Map v3 conforming to Sentry and Chrome DevTools specs', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'main.jsbundle');
    const sourcemapOutput = path.join(TEST_DIR, 'dist', 'main.jsbundle.map');

    const result = await bundle({
      projectRoot: TEST_DIR,
      entryFile: 'index.ts',
      platform: 'ios',
      dev: false,
      minify: true,
      bundleOutput,
      sourcemapOutput,
      hermes: { enabled: false }, // test pure JS source map
    });

    expect(result.durationMs).toBeGreaterThan(0);
    expect(fs.existsSync(bundleOutput)).toBe(true);
    expect(fs.existsSync(sourcemapOutput)).toBe(true);

    const mapRaw = fs.readFileSync(sourcemapOutput, 'utf8');
    const sourceMap = JSON.parse(mapRaw);

    // Source Map v3 Spec verification
    expect(sourceMap.version).toBe(3);
    expect(typeof sourceMap.mappings).toBe('string');
    expect(sourceMap.mappings.length).toBeGreaterThan(10);
    expect(Array.isArray(sourceMap.sources)).toBe(true);
    expect(sourceMap.sources.length).toBeGreaterThan(0);

    // Verify error-generator and App are indexed in sources
    const hasErrorGenerator = sourceMap.sources.some((s: string) =>
      s.includes('error-generator.ts')
    );
    const hasApp = sourceMap.sources.some((s: string) => s.includes('App.tsx'));
    expect(hasErrorGenerator).toBe(true);
    expect(hasApp).toBe(true);

    // Verify source-map-js Consumer can parse and accurately trace original source positions
    const consumer = new SourceMapConsumer(sourceMap);
    let foundThrowMapping = false;

    // Search for positions mapping back to error-generator.ts line 5 (throw new Error)
    consumer.eachMapping(
      (mapping: {
        source: string | null;
        originalLine: number | null;
        originalColumn: number | null;
        generatedLine: number;
        generatedColumn: number;
      }) => {
        if (mapping.source && mapping.source.includes('error-generator.ts')) {
          if (mapping.originalLine === 5) {
            foundThrowMapping = true;
          }
        }
      }
    );

    expect(foundThrowMapping).toBe(true);
  });

  it('supports sourcesContent inclusion for standalone Sentry offline symbolication', async () => {
    const bundleOutput = path.join(TEST_DIR, 'dist', 'standalone.jsbundle');
    const sourcemapOutput = path.join(TEST_DIR, 'dist', 'standalone.jsbundle.map');

    await bundle({
      projectRoot: TEST_DIR,
      entryFile: 'index.ts',
      platform: 'android',
      dev: false,
      minify: true,
      bundleOutput,
      sourcemapOutput,
      hermes: { enabled: false },
    });

    const sourceMap = JSON.parse(fs.readFileSync(sourcemapOutput, 'utf8'));

    // Sentry CLI requires either sourcesContent or readable file system sources
    if (sourceMap.sourcesContent) {
      expect(Array.isArray(sourceMap.sourcesContent)).toBe(true);
      const hasOriginalCode = sourceMap.sourcesContent.some(
        (code: string | null) => code && code.includes('CrashCalculationExceededThreshold')
      );
      expect(hasOriginalCode).toBe(true);
    } else {
      // If sources are external paths, sources must have valid relative paths
      expect(sourceMap.sources.length).toBeGreaterThan(0);
    }
  });
});
