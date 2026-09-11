# react-native-bun-build ⚡

> Ultra-fast, Bun-powered custom bundler CLI and modern development toolkit for React Native (bare RN) projects.  
> A complete, high-performance alternative to Metro and Re.Pack, built directly on `Bun.build()` and `Bun.serve()`.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.4%2B-black?logo=bun)](https://bun.sh)
[![React Native](https://img.shields.io/badge/React_Native-0.70%2B-blue?logo=react)](https://reactnative.dev)
[![Hermes](https://img.shields.io/badge/Hermes-Bytecode_AOT-purple)](https://hermesengine.dev)
[![Tooling: OXC](<https://img.shields.io/badge/Tooling-OXC_(oxlint_&_oxfmt)-orange>)](https://oxc.rs)

---

## 🎯 Key Highlights

- ⚡ **Lightning-Fast Bundling**: Powered by Bun's native Zig bundling engine (`Bun.build()`) with **AOT Hermes Bytecode (`.hbc`) compilation**.
- 🔄 **100% Drop-in Metro Replacement**: Seamlessly hooks into React Native Community CLI (`react-native.config.js`). Works out-of-the-box with standard Xcode Build Phases and Android Gradle scripts.
- 🚀 **Ultra-Fast Dev Server (`start`)**: Built on native `Bun.serve()` with **189ms Cold Startup**, **3ms Warm Bundle Serving (25x faster than Metro)**, and **11ms Real-Time HMR / Fast Refresh**.
- 🛠️ **Built-in Modern Scaffolder (`init`)**: Instant project generator with zero legacy clutter (no ESLint/Prettier slowdowns), optional **Redux Toolkit** setup, and multiplatform scaffolding (iOS, Android, macOS, Windows).
- 🗺️ **Integrated Diagnostics**: Full `/symbolicate` and `/open-stack-frame` implementation with interactive code frames mapping bundled LogBox errors back to original source lines.
- 📱🖥️ **Multiplatform Ready**: Native module redirection and smart fallbacks for iOS, Android, macOS (`react-native-macos`), and Windows (`react-native-windows`).
- 🎨 **Smart Asset Pipeline**: Automatic `@2x` / `@3x` scale detection, React Native `AssetRegistry` wrapping, and native folder extraction.
- 🧬 **Hybrid Babel Engine**: Native Bun transpilation for 95%+ of your files, selectively delegating to Babel only when necessary (Reanimated worklets, Flow types).

---

## 📊 3-Way Benchmark Snapshot (Metro vs react-native-bun-build vs Rollipop)

Benchmarked on React Native 0.87 with Hermes enabled (`--dev false`, `--reset-cache`, 3-run average). See [BENCHMARK.md](./BENCHMARK.md) for full details.

| Platform    | 번들러 (Bundler)                            | 핵심 엔진 (Engine)    | 평균 소요 시간 (Avg) | 산출물 크기 (Bundle Size) |       출력 포맷 (Format)       | 속도 개선 배수 (vs Metro) |
| :---------- | :------------------------------------------ | :-------------------- | :------------------: | :-----------------------: | :----------------------------: | :-----------------------: |
| **iOS**     | **Metro (기본 빌드)**                       | Babel + Node.js       |     **8,761 ms**     |          1.80 MB          |          Minified JS           |     1.0x _(baseline)_     |
| **iOS**     | **react-native-bun-build (우리가 만든 것)** | Bun + Babel Hybrid    |     **6,813 ms**     |          2.89 MB          | **Hermes Bytecode (.hbc) AOT** |    **1.29x faster** ⚡    |
| **iOS**     | **Rollipop**                                | Rolldown (Rust) + SWC |     **1,363 ms**     |          2.23 MB          |          Minified JS           |    **6.43x faster** ⚡    |
| **Android** | **Metro (기본 빌드)**                       | Babel + Node.js       |    **10,104 ms**     |          1.80 MB          |          Minified JS           |     1.0x _(baseline)_     |
| **Android** | **react-native-bun-build (우리가 만든 것)** | Bun + Babel Hybrid    |     **7,885 ms**     |          2.89 MB          | **Hermes Bytecode (.hbc) AOT** |    **1.28x faster** ⚡    |
| **Android** | **Rollipop**                                | Rolldown (Rust) + SWC |     **1,490 ms**     |          2.24 MB          |          Minified JS           |    **6.78x faster** ⚡    |

> [!NOTE]
> **산출물 포맷 차이**: Metro와 Rollipop은 순수 Minified JS만 생성하므로 앱 패키징 시 별도의 Hermes 컴파일 단계가 필요합니다. 반면 **`react-native-bun-build`**는 **Hermes Bytecode(.hbc) AOT 컴파일까지 일괄 완결**하여 네이티브 앱 빌드 시간을 대폭 줄입니다.

---

## 📦 Installation

```bash
# In your existing React Native project:
bun add -D react-native-bun-build

# Or with npm / yarn:
npm install --save-dev react-native-bun-build
yarn add -D react-native-bun-build
```

---

## ⚡ Quick Start with `init`

### 1. Scaffold a Brand New App

Generate a clean, high-performance React Native project configured with Bun, Hermes, OXC, and optional Redux Toolkit:

```bash
bunx react-native-bun-build init MyAwesomeApp
# or with global CLI:
bun-rn init MyAwesomeApp
```

**Interactive Prompts:**

1. **Target Platforms**: Choose `iOS`, `Android`, `macOS`, `Windows`, or `All Platforms`.
2. **Redux Toolkit**: Choose whether to install and pre-configure `@reduxjs/toolkit` and `react-redux` with a counter demo.

Non-interactive flags:

```bash
bun-rn init MyAwesomeApp --platforms all --redux
bun-rn init MyAwesomeApp --platforms mobile --no-redux
```

### 2. Add to an Existing React Native Project

Run inside your existing React Native root directory:

```bash
bunx react-native-bun-build init
```

This automatically:

- Registers `react-native-bun-build` commands into `react-native.config.js`.
- Updates `package.json` scripts to use `bun-rn` commands (`start`, `bundle`, `test`, `lint`, `format`, `check`).
- Configures Rust-based **OXC** (`.oxlintrc.json`, `.oxfmtrc.json`).

---

## 🚀 CLI Commands & Usage

### 1. Development Server (`start`)

Starts the high-performance `Bun.serve()` dev server with instant HMR and symbolication:

```bash
# Via bun-rn
bun-rn start

# Or via standard React Native CLI
npx react-native start

# Custom port or reset cache
bun-rn start --port 8081 --reset-cache
```

### 2. Production Bundling (`bundle`)

Bundles the application and compiles Hermes Bytecode:

```bash
# iOS Bundle
bun-rn bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output dist/main.jsbundle \
  --assets-dest dist/assets

# Android Bundle
bun-rn bundle \
  --entry-file index.js \
  --platform android \
  --dev false \
  --bundle-output dist/index.android.bundle \
  --assets-dest dist/res
```

#### Bundle Options

| Option                      | Description                                              | Default      |
| :-------------------------- | :------------------------------------------------------- | :----------- |
| `--entry-file <path>`       | Root entry file path                                     | _(required)_ |
| `--platform <string>`       | Target platform (`ios`, `android`, `macos`, `windows`)   | `ios`        |
| `--dev [boolean]`           | Dev mode (if false, minifies & compiles Hermes bytecode) | `true`       |
| `--bundle-output <path>`    | Output destination for generated bundle                  | _(required)_ |
| `--assets-dest <path>`      | Output directory for resolved images and fonts           | `undefined`  |
| `--sourcemap-output <path>` | Destination path for combined source maps                | `undefined`  |
| `--reset-cache`             | Clear caches before bundling                             | `false`      |

### 3. OXC Linting & Formatting (`lint`, `format`)

Fast Rust-based linting and formatting out-of-the-box (no ESLint/Prettier slowdowns):

```bash
# Lint project with oxlint (~10ms)
bun-rn lint
bun-rn lint --fix

# Format project with oxfmt
bun-rn format
bun-rn format --check

# Full CI check (lint + format check + tests)
bun-rn check
```

### 4. Environment Diagnostics (`doctor`)

Inspects your local environment for Bun, Node.js, React Native, Hermes compiler, Xcode, and Android SDK:

```bash
bun-rn doctor
```

---

## ⚙️ Configuration (`react-native-bun-build.config.ts`)

You can customize bundling behavior by placing a configuration file in your project root with full TypeScript autocompletion:

```typescript
// react-native-bun-build.config.ts
import { defineConfig } from 'react-native-bun-build';

export default defineConfig({
  // Custom asset extensions to process
  assetExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf'],

  // Custom module aliases
  alias: {
    '@components': './src/components',
    '@assets': './src/assets',
  },

  // Babel hybrid configuration
  babel: {
    // Regex patterns that require Babel transformation (e.g. worklets)
    transformPatterns: [/react-native-reanimated/, /custom-macro/],
    include: [],
    exclude: [],
  },

  // Hermes bytecode compilation settings
  hermes: {
    enabled: true, // Default: true in production (--dev false)
    hermescPath: undefined, // Custom hermesc path if needed
    flags: ['-O'],
  },

  minify: true,
});
```

---

## 📋 Ecosystem Compatibility Matrix (Verified)

Tested and verified on real-world React Native 0.87 applications:

| Library                                         | Module Type          |        Pipeline Path         | Status & Notes                                          |
| :---------------------------------------------- | :------------------- | :--------------------------: | :------------------------------------------------------ |
| **`@reduxjs/toolkit`** & **`react-redux`**      | State Management     |      ⚡ **Bun Native**       | ✅ Verified working on mobile & desktop                 |
| **`react-native-webview`**                      | Native WebView       |      ⚡ **Bun Native**       | ✅ Verified full rendering & web navigation             |
| **`react-native-svg`**                          | Fabric / TurboModule |      ⚡ **Bun Native**       | ✅ Zero-config native rendering                         |
| **`@react-native-async-storage/async-storage`** | TurboModule / CJS    |      ⚡ **Bun Native**       | ✅ Full async persistent storage verified               |
| **`react-native-safe-area-context`**            | Fabric / Insets      |      ⚡ **Bun Native**       | ✅ Insets and SafeAreaProvider verified                 |
| **`react-native-reanimated`**                   | JSI / C++ Worklets   |     🧬 **Babel Hybrid**      | ✅ Automatically routed to Babel for worklet transforms |
| **`react-native-macos`**                        | Desktop Platform     | ⚡ **Bun Native + Redirect** | ✅ Automatic core redirect on `--platform macos`        |
| **`react-native-windows`**                      | Desktop Platform     | ⚡ **Bun Native + Redirect** | ✅ Automatic core redirect on `--platform windows`      |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture details, local setup, test execution, and pull request guidelines.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.
