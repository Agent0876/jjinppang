# react-native-bun-build ⚡

> Ultra-fast, Bun-powered custom bundler CLI for React Native (bare RN) projects.  
> A high-performance alternative to Metro and Re.Pack, built directly on `Bun.build()`.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.4%2B-black?logo=bun)](https://bun.sh)
[![React Native](https://img.shields.io/badge/React_Native-0.70%2B-blue?logo=react)](https://reactnative.dev)

---

## 🎯 Features

- ⚡ **Lightning Fast**: Powered by Bun's native bundling engine (`Bun.build()`), delivering **3x–5x+ faster** production bundle builds compared to Metro.
- 🔄 **Drop-in Metro Replacement**: Follows React Native CLI command plugin specifications. Existing Xcode Build Phases and Gradle tasks invoke it without modifications.
- 📱 **Full Platform-Specific File Resolution**:
  1. `.{platform}.tsx` / `.{platform}.ts` / `.{platform}.jsx` / `.{platform}.js`
  2. `.native.tsx` / `.native.ts` / `.native.jsx` / `.native.js`
  3. Standard fallback extensions (`.tsx`, `.ts`, `.jsx`, `.js`, `.json`)
  4. Monorepo and symlinked package support with automatic `react-native` package condition resolution.
- 🎨 **Asset Transformation Pipeline**:
  - Intercepts images and fonts (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.ttf`, `.otf`).
  - Automatic `@2x` / `@3x` scale variant detection and grouping.
  - Generates React Native `AssetRegistry.registerAsset({ ... })` modules.
  - Automatically copies assets into iOS folder structures and Android `drawable-*` / `raw` buckets with sanitized resource identifiers.
- 🧬 **Hybrid Babel Processing**:
  - Preserves Bun's native speed for 95%+ of files.
  - Automatically routes files requiring Babel (e.g. `react-native-reanimated` worklets, Flow types in `react-native`) through Babel with in-memory caching.
- 🤖 **Hermes Bytecode Compilation**:
  - Automatically post-processes output bundles into Hermes Bytecode (`.hbc`) using `hermesc`.
  - Composes packaging and bytecode sourcemaps into unified sourcemaps.

---

## 📦 Installation

```bash
# Using Bun
bun add -D react-native-bun-build

# Using Yarn
yarn add -D react-native-bun-build

# Using npm
npm install --save-dev react-native-bun-build
```

---

## 🚀 Quick Start

### 1. Register with React Native CLI

In your React Native project root, open or create `react-native.config.js`:

```javascript
// react-native.config.js
module.exports = {
  commands: require('react-native-bun-build/commands'),
};
```

That's it! Now standard React Native CLI bundling will automatically use `react-native-bun-build`:

```bash
# iOS Bundle
npx react-native bundle --entry-file index.js --platform ios --dev false --bundle-output dist/main.jsbundle --assets-dest dist/assets

# Android Bundle
npx react-native bundle --entry-file index.js --platform android --dev false --bundle-output dist/index.android.bundle --assets-dest dist/res
```

---

## 🛠 Native Build Integration

### iOS (Xcode)

In Xcode, locate your target's **Build Phases** -> **Bundle React Native code and images**.  
If you use a custom command name (like `bun-bundle`):

```bash
export BUNDLE_COMMAND=bun-bundle
../node_modules/react-native/scripts/react-native-xcode.sh
```

*(If you replace `bundle` in `react-native.config.js`, no Xcode modification is necessary).*

### Android (Gradle)

In `android/app/build.gradle`:

```groovy
project.ext.react = [
    bundleCommand: "bun-bundle", // or "bundle"
]
```

---

## ⚙️ Configuration (`react-native-bun-build.config.js`)

You can optionally place a `react-native-bun-build.config.js` in your project root:

```javascript
// react-native-bun-build.config.js
module.exports = {
  // Custom asset extensions to process
  assetExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf'],

  // Custom module aliases
  alias: {
    '@components': './src/components',
    '@assets': './src/assets',
  },

  // Babel hybrid configuration
  babel: {
    // Patterns that trigger Babel transformation (worklets, macros, etc.)
    transformPatterns: [
      /react-native-reanimated/,
      /custom-macro/,
    ],
    // Force include/exclude specific paths
    include: [],
    exclude: [],
  },

  // Hermes bytecode compilation settings
  hermes: {
    enabled: true, // Default: true in production (--dev false)
    // Custom path to hermesc if not in standard locations
    hermescPath: undefined,
    // Extra compiler flags passed to hermesc
    flags: ['-O'],
  },

  // Override minification
  minify: true,
};
```

---

## 💻 Standalone CLI Usage

You can also run the custom CLI directly without `react-native`:

```bash
bun-rn bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output dist/main.jsbundle \
  --assets-dest dist/assets \
  --sourcemap-output dist/main.jsbundle.map
```

### CLI Arguments

| Argument | Description | Default |
| :--- | :--- | :--- |
| `--entry-file <path>` | Path to root JS/TS file | *(required)* |
| `--platform <string>` | Target platform (`ios` or `android`) | `ios` |
| `--dev [boolean]` | Development mode (if false, minifies & Hermes compiles) | `true` |
| `--bundle-output <path>` | Destination file path for generated bundle | *(required)* |
| `--bundle-encoding <string>` | Output file encoding | `utf8` |
| `--assets-dest <path>` | Directory path to store resolved assets | `undefined` |
| `--sourcemap-output <path>` | Path to save output sourcemap | `undefined` |
| `--minify [boolean]` | Explicitly override minification | `!dev` |
| `--config <path>` | Path to custom config file | Auto-detected |
| `--reset-cache` | Clear caches before build | `false` |

---

## ⚠️ Known Limitations

1. **Development Server & Fast Refresh**: This phase only implements the production `bundle` command. Development server (`start`, HMR, Fast Refresh) will be added in the next release.
2. **Flow Type Annotations in Third-Party Libraries**: `node_modules/react-native` and `@react-native/*` are handled by our hybrid Babel pipeline. If a third-party npm package publishes untranspiled Flow syntax with a `.js` extension, add its name to `babel.transformPatterns` in your config.
3. **Legacy Haste Module System**: `@providesModule` syntax is deprecated in React Native. Standard npm package resolution and package `exports` are used.
4. **Expo Managed Workflow**: Currently intended for React Native bare CLI projects.

---

## 📊 Benchmark

See [BENCHMARK.md](./BENCHMARK.md) for detailed performance comparisons against Metro on real bare React Native applications.
