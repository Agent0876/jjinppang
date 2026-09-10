// Direct Bun.build() comparison: raw vs minified vs granular minify
import fs from 'node:fs';
import path from 'node:path';

// Import plugins directly
import { createResolverPlugin } from '/Users/shinseungmin/react-native-bun-build/packages/bundler-plugin/src/resolver.ts';
import { createAssetPlugin } from '/Users/shinseungmin/react-native-bun-build/packages/bundler-plugin/src/assets.ts';
import { createBabelHybridPlugin } from '/Users/shinseungmin/react-native-bun-build/packages/bundler-plugin/src/babel-hybrid.ts';

const projectRoot = '/Users/shinseungmin/react-native-bun-build/fixtures/TestApp';
const entryFile = path.join(projectRoot, 'index.js');

// Create virtual entry
const tempDir = path.join(projectRoot, '.bun-rn-temp');
fs.mkdirSync(tempDir, { recursive: true });
const virtualEntry = path.join(tempDir, `compare-entry-${Date.now()}.js`);
fs.writeFileSync(
  virtualEntry,
  `
var __DEV__ = false;
var global = typeof global !== 'undefined' ? global : globalThis;
global.__DEV__ = __DEV__;
try { require('react-native/Libraries/Core/InitializeCore'); } catch(e) {
  try { require('react-native/setup-env'); } catch(e2) {}
}
require(${JSON.stringify(entryFile)});
`
);

const collectedAssets: any[] = [];
const plugins = [
  createResolverPlugin({ platform: 'ios', projectRoot, alias: { '@app': './' } }),
  createAssetPlugin(
    {
      projectRoot,
      platform: 'ios',
      assetExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf'],
    },
    collectedAssets
  ),
  createBabelHybridPlugin({ projectRoot }),
];

const commonOpts = {
  entrypoints: [virtualEntry],
  target: 'browser' as const,
  format: 'iife' as const,
  sourcemap: 'external' as const,
  define: {
    __DEV__: 'false',
    'process.env.NODE_ENV': '"production"',
  },
  plugins,
};

async function buildVariant(name: string, minifyOpt: any, outputName: string) {
  console.log(`\n=== Building: ${name} ===`);
  const result = await Bun.build({ ...commonOpts, minify: minifyOpt });
  if (!result.success) {
    console.error('Build failed:', result.logs.map((l) => l.message).join('\n'));
    return;
  }
  const jsOutput = result.outputs.find((o) => o.kind === 'entry-point');
  if (!jsOutput) {
    console.error('No output');
    return;
  }

  const text = await jsOutput.text();
  const outPath = path.join(projectRoot, 'dist', outputName);
  fs.writeFileSync(outPath, text, 'utf8');

  const lines = text.split('\n').length;
  const sizeKB = (Buffer.byteLength(text) / 1024).toFixed(1);
  console.log(`  Size: ${sizeKB} KB, Lines: ${lines}`);
  return { size: Buffer.byteLength(text), lines };
}

// 1. No minification at all
const raw = await buildVariant('NO MINIFY', false, 'bun-raw.jsbundle');

// 2. minify: true (boolean — should equal all three true)
const minBool = await buildVariant('minify: true (boolean)', true, 'bun-min-bool.jsbundle');

// 3. Granular: all three explicit
const minAll = await buildVariant(
  'minify: {whitespace,identifiers,syntax}',
  { whitespace: true, identifiers: true, syntax: true },
  'bun-min-all.jsbundle'
);

// 4. Only whitespace
const minWS = await buildVariant(
  'minify: {whitespace only}',
  { whitespace: true, identifiers: false, syntax: false },
  'bun-min-ws.jsbundle'
);

// 5. Only identifiers
const minID = await buildVariant(
  'minify: {identifiers only}',
  { whitespace: false, identifiers: true, syntax: false },
  'bun-min-id.jsbundle'
);

// 6. Only syntax
const minSyn = await buildVariant(
  'minify: {syntax only}',
  { whitespace: false, identifiers: false, syntax: true },
  'bun-min-syn.jsbundle'
);

// Cleanup
try {
  fs.unlinkSync(virtualEntry);
} catch {}

console.log('\n=== SUMMARY ===');
console.log('| Variant | Size (KB) | Lines | Savings vs Raw |');
console.log('| :--- | ---: | ---: | ---: |');
const variants = [
  { name: 'Raw (no minify)', ...raw },
  { name: 'minify: true', ...minBool },
  { name: 'minify: {all three}', ...minAll },
  { name: 'whitespace only', ...minWS },
  { name: 'identifiers only', ...minID },
  { name: 'syntax only', ...minSyn },
];
for (const v of variants) {
  if (!v.size) continue;
  const savings = raw ? ((1 - v.size / raw.size) * 100).toFixed(1) : '0';
  console.log(`| ${v.name} | ${(v.size / 1024).toFixed(1)} | ${v.lines} | ${savings}% |`);
}
