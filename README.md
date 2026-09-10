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

## ⚠️ Known Limitations & Library Compatibility

실제 React Native 네이티브 모듈 라이브러리 실측 테스트(`react-native-svg`, `react-native-reanimated`, `@react-native-async-storage/async-storage` 등)를 바탕으로 검증된 호환성 분류 및 기술적 제약사항입니다.

### 📋 Library Compatibility Matrix (실측 검증 완료)

| 라이브러리 | 네이티브 모듈 유형 | 번들러 파이프라인 경로 | 상태 / 비고 |
| :--- | :--- | :---: | :---: |
| **`react-native-svg`** | Fabric / TurboModule | ⚡ **Bun Native (Zero-Config)** | ✅ Babel 없이 Bun 단독으로 100% 정상 번들링 및 렌더링 |
| **`@react-native-async-storage/async-storage`** | TurboModule / CJS Bridge | ⚡ **Bun Native (Zero-Config)** | ✅ 비동기 스토리지 I/O 정상 동작 |
| **`react-native-safe-area-context`** | Fabric / TurboModule | ⚡ **Bun Native (Zero-Config)** | ✅ Insets 및 Provider 정상 동작 |
| **`react-native-reanimated`** | JSI / C++ Worklet Engine | 🧬 **Babel Hybrid 필수** | ✅ `'worklet'` AST 변환을 위해 Babel 하이브리드 필수 경유 |
| **`react-native` / `@react-native/*`** | Core Engine | 🧬 **Babel Hybrid 필수** | ✅ `.js` 내부의 Flow 타입 구문 제거를 위해 자동 Babel 라우팅 |

---

### 1. Babel 하이브리드 경로가 필수인 케이스 (Babel Hybrid Required)

1. **Worklet / 컴파일 타임 AST 매크로 의존 라이브러리 (`react-native-reanimated` 등)**:
   - Reanimated의 `useAnimatedStyle`, `useSharedValue` 콜백 함수는 UI 스레드에서 직접 구동되어야 하므로, `react-native-reanimated/plugin`을 통한 클로저 캡처(`_f._closure`), `__workletHash` 생성, JS 팩토리 함수 래핑이 필수적입니다.
   - **동작**: `react-native-bun-build`의 하이브리드 플러그인이 `worklet` / `useAnimatedStyle` 패턴을 자동 감지하여 해당 파일만 선택적으로 Babel로 라우팅합니다.
   - ⚠️ **순수 Bun 단독 강제 시**: AST 변환이 누락되어 런타임에 `"Reanimated failed to create a worklet"` 에러 또는 크래시가 발생합니다.
2. **Flow 문법으로 배포된 코드 (`react-native` 코어 등)**:
   - Bun의 네이티브 파서는 TypeScript 및 표준 JavaScript를 지원하지만 **Flow 문법(`import typeof`, `type X = ...`)은 지원하지 않습니다.**
   - `react-native` 및 `@react-native/*`는 번들러 내장 하이브리드 규칙으로 자동 처리되나, 만약 제3자 라이브러리가 미컴파일된 Flow 문법을 `.js`로 배포한 경우 `config.babel.include`에 추가해야 합니다.

---

### 2. 순수 Bun 경로로 즉시 동작하는 케이스 (Zero-Config)

* **`react-native-svg`**, **`@react-native-async-storage/async-storage`**, **`react-native-screens`** 등 대다수의 네이티브 모듈 라이브러리:
  * TypeScript/JSX 표준 문법 및 TurboModule/Fabric 네이티브 바인딩으로 작성된 패키지는 **Babel을 전혀 거치지 않고 Bun 네이티브 파서만으로 10~50배 빠르게 번들링**됩니다.

---

### 3. 아예 지원되지 않거나 구조적으로 불가능한 제약 (Unsupported)

1. **동적 `require()` (Dynamic Requires)**:
   - `const mod = require('./locales/' + lang)`와 같은 런타임 동적 문자열 require는 Bun.build의 정적 그래프 분석 특성상 포함되지 않거나 런타임 에러를 유발합니다. 반드시 정적 import/require를 사용해야 합니다.
2. **Metro 전용 Haste 모듈 시스템 (`@providesModule`)**:
   - 구형 Facebook 라이브러리에서 쓰이던 Haste 모듈 해석은 지원하지 않으며, 표준 npm Node 모듈 해석 및 `package.json`의 `exports`/`main` 필드만 지원합니다.
3. **Metro 독점 Transformer 플러그인**:
   - `metro.config.js`의 내부 AST 조작 훅이나 Metro 전용 바벨 트랜스포머에 하드코딩된 플러그인은 Bun 파이프라인에서 실행되지 않습니다.
4. **개발 서버 (HMR / Fast Refresh)**:
   - 현재 릴리스는 오프라인 번들 생성을 위한 **프로덕션 `bundle` 커맨드**에 집중되어 있으며, 개발 서버(`start`, HMR, WebSocket 연결)는 차기 릴리스에서 제공될 예정입니다.
5. **Expo Managed Workflow**:
   - Bare React Native CLI 환경을 기준으로 설계되었습니다.

---

## 📊 Benchmark

See [BENCHMARK.md](./BENCHMARK.md) for detailed performance comparisons against Metro on real bare React Native applications.
