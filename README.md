# 🥟 찐빵 (jjinppang) ⚡

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

## 📊 3-Way Benchmark Snapshot (Metro vs 찐빵 (jjinppang) vs Rollipop)

Benchmarked on React Native 0.87 with Hermes enabled (`--dev false`, `--reset-cache`, 3-run average). See [BENCHMARK.md](./BENCHMARK.md) for full details.

| Platform    | 번들러 (Bundler)                  | 핵심 엔진 (Engine)          | 전체 빌드 시간 (Avg) | 순수 JS 크기 (Minified JS) | Hermes 바이트코드 (.hbc) |   속도 개선 배수 (vs Metro)    |
| :---------- | :-------------------------------- | :-------------------------- | :------------------: | :------------------------: | :----------------------: | :----------------------------: |
| **iOS**     | **Metro (기본 빌드)**             | Babel + Node.js             |     **9,356 ms**     |          1.80 MB           |         2.32 MB          |       1.0x _(baseline)_        |
| **iOS**     | **찐빵 (jjinppang - Cold)**       | Bun + Babel Hybrid          |     **4,487 ms**     |       **1.21 MB** ⚡       |      **1.32 MB** ⚡      |      **2.09x faster** ⚡       |
| **iOS**     | **찐빵 (jjinppang - Warm Cache)** | Bun + Persistent Disk Cache |   **1,938 ms** ⚡    |       **1.21 MB** ⚡       |      **1.32 MB** ⚡      | **4.83x faster** ⚡ _(최고속)_ |
| **iOS**     | **Rollipop**                      | Rolldown (Rust) + SWC       |     **2,550 ms**     |          2.23 MB           |         1.53 MB          |      **3.67x faster** ⚡       |
| **Android** | **Metro (기본 빌드)**             | Babel + Node.js             |     **8,880 ms**     |          1.80 MB           |         2.33 MB          |       1.0x _(baseline)_        |
| **Android** | **찐빵 (jjinppang - Cold)**       | Bun + Babel Hybrid          |     **4,369 ms**     |       **1.22 MB** ⚡       |      **1.32 MB** ⚡      |      **2.03x faster** ⚡       |
| **Android** | **찐빵 (jjinppang - Warm Cache)** | Bun + Persistent Disk Cache |   **1,959 ms** ⚡    |       **1.22 MB** ⚡       |      **1.32 MB** ⚡      | **4.53x faster** ⚡ _(최고속)_ |
| **Android** | **Rollipop**                      | Rolldown (Rust) + SWC       |     **2,515 ms**     |          2.24 MB           |         1.54 MB          |      **3.53x faster** ⚡       |

> [!NOTE]
> **정규화된 번들 크기 및 속도 비교**: 모든 번들러 산출물을 **1) 순수 Minified JS** 및 **2) React Native 공식 Hermes 바이트코드(.hbc)** 로 공정하게 정규화하여 교차 측정한 수치입니다. **`jjinppang`**은 영구 디스크 캐시(`node_modules/.cache/jjinppang`)를 통해 **1.9초대 빌드(4.83x 속도)**를 달성하여 롤리팝(2.5초)보다 빠르며, 순수 JS 크기(1.21 MB)와 Hermes 바이트코드(1.32 MB) 모두 **3대 번들러 중 압도적으로 가장 작고 가볍습니다.** 또한 Hermes AOT 컴파일을 번들링 파이프라인에서 일괄 완결합니다.

---

## 📦 Installation

```bash
# In your existing React Native project:
bun add -D jjinppang

# Or with npm / yarn:
npm install --save-dev jjinppang
yarn add -D jjinppang
```

---

## ⚡ Quick Start with `init`

### 1. Scaffold a Brand New App

Generate a clean, high-performance React Native project configured with Bun, Hermes, OXC, and optional Redux Toolkit:

```bash
bunx jjinppang init MyAwesomeApp
# or with global CLI:
jjinppang init MyAwesomeApp
```

> [!TIP]
> `bun-rn` and `react-native-bun-build` CLI command aliases are also fully supported for seamless backward compatibility.

**Interactive Prompts:**

1. **Target Platforms**: Choose `iOS`, `Android`, `macOS`, `Windows`, or `All Platforms`.
2. **Redux Toolkit**: Choose whether to install and pre-configure `@reduxjs/toolkit` and `react-redux` with a counter demo.
3. **React Native WebView**: Choose whether to install and configure `react-native-webview` with an in-app browser demo.
4. **Monorepo Workspace**: Choose whether to structure the project as a modern Bun monorepo (`apps/mobile` + `packages/ui` via `workspace:*`).
5. **Next.js Web App**: Choose whether to configure a universal Next.js 15 web app (`apps/web`) with `react-native-web` sharing cross-platform UI primitives.

Non-interactive flags:

```bash
# Universal Monorepo: Mobile (iOS/Android) + Next.js Web (App Router) + Shared UI
jjinppang init MyUniversalApp --next --redux --webview

# Full-stack monorepo with Redux and WebView
jjinppang init MyMonorepo --monorepo --redux --webview --platforms all

# Minimal mobile app without extras
jjinppang init MyAwesomeApp --platforms mobile --no-redux --no-webview
```

### 2. Add to an Existing React Native Project

Run inside your existing React Native root directory:

```bash
bunx jjinppang init
```

This automatically:

- Registers `jjinppang` commands into `react-native.config.js`.
- Updates `package.json` scripts to use `jjinppang` commands (`start`, `bundle`, `test`, `lint`, `format`, `check`).
- Configures Rust-based **OXC** (`.oxlintrc.json`, `.oxfmtrc.json`).

---

## 🚀 CLI Commands & Usage

### 1. Development Server (`start`)

Starts the high-performance `Bun.serve()` dev server with instant HMR and symbolication:

```bash
# Via jjinppang
jjinppang start

# Or via standard React Native CLI
# Custom port and host
jjinppang start --port 8088 --host 0.0.0.0 --reset-cache
```

#### ⌨️ Interactive Terminal Shortcuts

While `jjinppang start` is running in your terminal, interact with connected devices using single-key shortcuts:

|   Key   | Action               | Description                                                                |
| :-----: | :------------------- | :------------------------------------------------------------------------- |
| **`r`** | **Reload App**       | Broadcasts reload command to all connected iOS/Android devices & emulators |
| **`d`** | **Developer Menu**   | Opens in-app Developer Menu (`devMenu` packet + ADB keyevent 82)           |
| **`i`** | **iOS Simulator**    | Launches or focuses the iOS Simulator on macOS                             |
| **`a`** | **Android Emulator** | Configures ADB reverse socket (`tcp:8081`) for Android devices             |
| **`c`** | **Clear Console**    | Clears the terminal screen                                                 |
| **`q`** | **Quit Server**      | Gracefully stops the dev server and cleans up child processes              |

#### 🔥 React Fast Refresh (State-Preserving HMR)

`jjinppang` includes first-class React Fast Refresh integration. Component modifications update within milliseconds over WebSockets while preserving React Hook state (`useState`, `useRef`, input field values).

#### 🔍 Hermes Chrome DevTools / CDP Inspector

Connect Chrome DevTools or Flipper directly to Hermes:

- Navigate to `chrome://inspect` in Google Chrome
- Discover connected Hermes targets dynamically at `http://localhost:8081/json`
- Set breakpoints, inspect console logs, and profile Hermes CPU performance in real time

### 2. Standalone Production Bundler (`bundle`)

Bundles the application and compiles Hermes Bytecode:

```bash
# iOS Bundle
jjinppang bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output dist/main.jsbundle \
  --assets-dest dist/assets

# Android Bundle
jjinppang bundle \
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
jjinppang lint
jjinppang lint --fix

# Format project with oxfmt
jjinppang format
jjinppang format --check

# Full CI check (lint + format check + tests)
jjinppang check
```

### 4. Environment Diagnostics (`doctor`)

Inspects your local environment for Bun, Node.js, React Native, Hermes compiler, Xcode, and Android SDK:

```bash
jjinppang doctor
```

---

## ⚙️ Configuration (`jjinppang.config.ts`)

You can customize bundling behavior by placing a configuration file in your project root with full TypeScript autocompletion:

```typescript
// jjinppang.config.ts
import { defineConfig } from 'jjinppang';

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

### 🌐 Expo & Metro Integration (`withJjinppang`)

For projects powered by Expo or using standard `metro.config.js`, wrap your config with `withJjinppang`:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withJjinppang } = require('@jjinppang/core');

const config = getDefaultConfig(__dirname);
module.exports = withJjinppang(config, {
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
