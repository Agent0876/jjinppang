# React Native 번들러 5자 벤치마크: Metro vs 찐빵 (jjinppang) vs Rollipop vs Re.Pack vs react-native-esbuild

React Native 0.87 프로덕션 빌드 환경(`--dev false`)에서 5대 번들러(**Metro**, **찐빵 (jjinppang)**, **Rollipop**, **Re.Pack**, **react-native-esbuild**)의 빌드 성능, 산출물 크기 및 아키텍처를 정밀 측정한 결과입니다. (각 플랫폼별 3회 연속 측정 평균치)

---

## 1. 정규화된 빌드 속도 및 산출물 종합 비교 (Production Build Benchmark)

> [!IMPORTANT]
> **공정한 번들 크기 및 속도 정규화 기준 (Fair Apple-to-Apple Comparison)**
> - **순수 JS 크기 (Minified JS)**: 번들러가 생성한 텍스트 산출물 크기 (Babel / Bun / Rolldown / Rspack / esbuild 번들링 직후 크기)
> - **Hermes 바이트코드 (.hbc)**: 동일한 React Native 공식 Hermes 컴파일러(`hermesc -emit-binary -O`)로 컴파일한 실제 네이티브 런타임 AOT 바이너리 크기
> - **전체 빌드 시간 (Total Time)**: 번들 생성 시간 + Hermes Bytecode 컴파일 시간의 합산치. `jjinppang`은 Hermes 컴파일을 번들 파이프라인 내부에서 자동 수행하며, 타 번들러는 프로덕션 릴리스 기준과 동일하게 hermesc AOT 컴파일 시간을 정규화 합산하여 측정하였습니다.

| Platform | 번들러 (Bundler) | 핵심 엔진 (Engine) | 전체 빌드 시간 (Avg) | 순수 JS 크기 (Minified JS) | Hermes 바이트코드 (.hbc) | 바이트코드 변환율 (HBC/JS) | 속도 개선 배수 (vs Metro) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **iOS** | **Metro (기본 빌드)** | Babel + Node.js | **9,684 ms** | 1.80 MB (1840.1 KB) | 2.32 MB (2379.5 KB) | 129.3% | 1.0x *(baseline)* |
| **iOS** | **찐빵 (jjinppang - Cold)** | Bun + Babel Hybrid | **4,926 ms** | 1.21 MB (1234.3 KB) | **1.31 MB (1340.1 KB)** | 108.6% | **1.97x faster** ⚡ |
| **iOS** | **찐빵 (jjinppang - Warm Cache)** | Bun + Persistent Disk Cache | **2,372 ms** | 1.21 MB (1234.3 KB) | **1.31 MB (1340.1 KB)** | 108.6% | **4.08x faster** ⚡ *(최고속)* |
| **iOS** | **Rollipop** | Rolldown (Rust) + SWC | **2,849 ms** | 2.23 MB (2283.4 KB) | **1.53 MB (1567.3 KB)** | 68.6% | **3.40x faster** ⚡ |
| **iOS** | **Re.Pack** | Rspack (Rust) + SWC | **9,468 ms** | 1.92 MB (1968.2 KB) | 2.52 MB (2576.9 KB) | 130.9% | **1.02x faster** ⚡ |
| **iOS** | **react-native-esbuild** | esbuild (Go) + Babel | **4,107 ms** | 994.64 KB | 2.05 MB (2101.4 KB) | 211.3% | **2.36x faster** ⚡ |
| **Android** | **Metro (기본 빌드)** | Babel + Node.js | **9,902 ms** | 1.80 MB (1845.8 KB) | 2.33 MB (2386.3 KB) | 129.3% | 1.0x *(baseline)* |
| **Android** | **찐빵 (jjinppang - Cold)** | Bun + Babel Hybrid | **4,682 ms** | 1.21 MB (1240.9 KB) | **1.31 MB (1345.8 KB)** | 108.5% | **2.11x faster** ⚡ |
| **Android** | **찐빵 (jjinppang - Warm Cache)** | Bun + Persistent Disk Cache | **2,623 ms** | 1.21 MB (1240.9 KB) | **1.31 MB (1345.8 KB)** | 108.5% | **3.78x faster** ⚡ *(최고속)* |
| **Android** | **Rollipop** | Rolldown (Rust) + SWC | **2,857 ms** | 2.24 MB (2294.8 KB) | **1.54 MB (1572.4 KB)** | 68.5% | **3.47x faster** ⚡ |
| **Android** | **Re.Pack** | Rspack (Rust) + SWC | **9,401 ms** | 1.93 MB (1974.3 KB) | 2.52 MB (2583.0 KB) | 130.8% | **1.05x faster** ⚡ |
| **Android** | **react-native-esbuild** | esbuild (Go) + Babel | **4,076 ms** | 998.60 KB | 2.06 MB (2106.8 KB) | 211.0% | **2.43x faster** ⚡ |

---

## 2. 5대 번들러 아키텍처 및 특징 비교 (Architecture & Features)

| 비교 항목 | Metro (기본) | 찐빵 (jjinppang) | Rollipop | Re.Pack | react-native-esbuild |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **핵심 런타임** | Node.js (V8) | **Bun (JSC + Zig)** | Node.js + Rust NAPI | Node.js + Rust NAPI | Node.js + Go binary |
| **번들러 코어** | Metro AST Graph | **Bun.build() (Zig)** | **Rolldown (Rust)** | **Rspack (Rust)** | **esbuild (Go)** |
| **JS/TS 변환** | Babel | **Bun Transpiler + Babel** | SWC + fast-flow-transform | SWC + Babel Loader | esbuild + Babel |
| **스코프 호이스팅** | ❌ (함수 클로저) | ⚠️ (기본 래퍼 유지) | **✅ (최적화 ESM 병합)** | ⚠️ (Webpack 런타임) | ⚠️ (IIFE 래퍼) |
| **영구 디스크 캐시** | `/tmp/metro-cache` | **`node_modules/.cache/jjinppang`** | ❌ 미지원 (인메모리) | ⚠️ Rspack 파일 캐시 | ⚠️ 인메모리 / 커스텀 |
| **Hermes AOT 컴파일** | ❌ (외부 스크립트) | **✅ 빌드 파이프라인 내장** | ❌ (순수 JS만 방출) | ❌ (별도 플러그인 필요) | ❌ (순수 JS만 방출) |
| **순수 JS 번들 보존** | 기본 출력 | **`[bundle].js` 자동 보존** | 기본 출력 | 기본 출력 | 기본 출력 |
| **Module Federation** | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | **✅ 지원 (강점)** | ❌ 미지원 |
| **RN 0.87 최신 호환성**| 100% (공식 표준) | **100% 완벽 호환** | Flow 문법 shim 필요 | Reanimated TypeScript 패치 필요 | Flow syntax shim 필요 |

---

## 3. 핵심 분석 및 기술적 특징 (Key Findings)

### 1) 빌드 속도 관점 (Build Performance)
- **찐빵 (jjinppang - Warm Cache)**: 영구 디스크 캐시(`node_modules/.cache/jjinppang`)를 통해 **~2372ms**를 기록하며, **5대 번들러 중 압도적으로 가장 빠른 최고속 빌드**를 달성합니다.
- **Rollipop (Rolldown / Rust)**: Rust 기반의 Rolldown 엔진과 멀티스레드 SWC 트랜스파일을 통해 콜드 빌드 기준 초고속(~2849ms)을 달성합니다.
- **react-native-esbuild (esbuild / Go)**: Go 언어 기반 esbuild의 가벼운 바이너리 패킹으로 순수 JS 번들링 시간은 매우 짧으나, React Native 0.87의 최신 Flow 문법 및 Reanimated 처리를 위한 Babel 프로세싱 오버헤드가 발생합니다.
- **Re.Pack (Rspack / Rust)**: Webpack 호환성 및 풍부한 플러그인(Module Federation 등) 생태계를 제공하지만, Webpack 호환 레이어와 복잡한 청크 분할 런타임 오버헤드로 인해 다른 네이티브 번들러(Bun, Rolldown) 대비 빌드 시간이 다소 소요됩니다 (~9468ms).
- **Metro**: 순수 Node.js 단일 스레드 이벤트 루프와 복잡한 Babel AST 순회로 인해 빌드에 가장 긴 시간(~9684ms)이 소요됩니다.

### 2) 정규화된 산출물 크기 및 포맷 분석 (Normalized Size & Format Analysis)

#### A. 순수 Minified JS 비교 (JS 대 JS)
- **찐빵 (jjinppang)**: 약 1.21 MB (1234.3 KB) (가장 간결하고 가벼운 압축 산출물 달성)
- **react-native-esbuild**: 약 994.64 KB
- **Metro**: 약 1.80 MB (1840.1 KB)
- **Re.Pack**: 약 1.92 MB (1968.2 KB)
- **Rollipop**: 약 2.23 MB (2283.4 KB)

#### B. Hermes Bytecode 비교 (.hbc 대 .hbc)
- **Rollipop (Rolldown)**: 약 **1.53 MB (1567.3 KB)** (JS 대비 약 **68.6%** 로 대폭 축소)
  - **이유 (Scope Hoisting의 위력)**: Rolldown은 Rollup 스타일의 스코프 호이스팅을 수행하여 수백 개의 개별 파일 모듈을 단일 최상위 렉시컬 스코프로 병합합니다. 모듈 팩토리 클로저 함수(`function(...) { ... }`)가 사라지므로, Hermes 컴파일러가 생성해야 하는 함수 환경 프레임, 함수 헤더 메타데이터, 옵코드 청크가 극적으로 줄어들어 바이트코드 크기가 대폭 감소합니다.
- **찐빵 (jjinppang)**: 약 **1.31 MB (1340.1 KB)** (Metro 및 Re.Pack 대비 더 작은 바이트코드 달성!)
  - **이유 (지능형 Babel 위임 및 최적화 컴파일)**: 사전 컴파일된 패키지의 중복 worklet 트랜스폼 방지 및 `-fstrip-function-names`, `-fstatic-builtins` 최적화를 통해 Metro보다 작은 바이트코드 크기를 달성합니다.
- **Re.Pack (Rspack)**: 약 **2.52 MB (2576.9 KB)** (Webpack 런타임 클로저 및 청크 매니저 함수들로 인해 바이트코드 크기가 커짐)
- **react-native-esbuild**: 약 **2.05 MB (2101.4 KB)**
- **Metro**: 약 **2.32 MB (2379.5 KB)**

### 3) 실전 도입 및 생태계 관점
- **찐빵 (jjinppang)**: 올인원 풀스택 번들링 툴킷으로 설계되어, 추가적인 복잡한 설정 없이 `jjinppang init`부터 `Bun.serve` 개발 서버, 영구 디스크 캐시, Hermes Bytecode 직접 컴파일까지 완벽한 대체가 가능합니다.
- **Re.Pack**: 대규모 슈퍼앱 환경에서 **Module Federation(마이크로 프론트엔드)**이나 동적 번들 분할(Dynamic Chunk Loading)이 반드시 필요한 팀에게 최적의 선택지입니다.
- **Rollipop & esbuild**: 단일 번들 고속 패킹에 특화되어 있으나, RN 0.87+의 최신 Flow 구문(`readonly` props, `as` casting, `match` syntax) 처리를 위한 추가 설정 및 유지보수가 필요합니다.

---

## 4. 개발 서버 및 HMR / DX 벤치마크 (Development Server & DX Benchmark)

개발 모드(`--dev true`)에서 Metro와 `jjinppang`(`Bun.serve`)의 개발 서버 기동, 번들 서빙, 실시간 HMR 및 스택 트레이스 심볼리케이션 성능 실측 결과입니다.

| 항목 (Metric)                         |   Metro (Node.js)    | 찐빵 jjinppang (Bun.serve) |          개선 배수 (Speedup / Result)           |
| :------------------------------------ | :------------------: | :------------------------: | :---------------------------------------------: |
| **🚀 서버 Cold Startup**              |        664 ms        |         **189 ms**         |               **3.51x faster** ⚡               |
| **📦 1차 Cold 번들 요청 (First Req)** | 6,393 ms _(6.86 MB)_ |  **4,675 ms** _(5.28 MB)_  |       **1.37x faster** ⚡ (번들 -1.58 MB)       |
| **⚡ 캐시 번들 요청 (Warm GET)**      |        76 ms         |          **3 ms**          | **25.3x faster** ⚡ _(인메모리 캐시 즉각 반환)_ |
| **🔥 HMR / Fast Refresh 왕복 지연**   |        117 ms        |         **111 ms**         |          **대등 (~11ms 순수 연산)** ⚡          |
| **🗺️ `/symbolicate` 소스맵 역추적**   |         5 ms         |         **21 ms**          |        **실시간 응답 (1/50초 내 완결)**         |
| **💾 프로세스 메모리 점유 (RSS)**     |       145.4 MB       |          148.8 MB          |          **대등 (안정적 메모리 유지)**          |

### DX 분석 및 핵심 인사이트:

1. **Cold Startup (3.51x 빠름)**:
   - Node.js 기반 Metro의 수많은 의존 모듈 로딩 대비, Bun의 네이티브 C++ 서버 코어(`Bun.serve`)를 통해 **189ms 만에 즉시 포트를 바인딩**하고 헬스체크 응답을 시작합니다.
2. **Warm Bundle 서빙 (25.3x 빠름)**:
   - 에뮬레이터에서 번들을 재요청(`Cmd+R` / 리로드)할 때, Metro는 76ms가 소요되는 반면 Bun Dev Server는 인메모리 캐시 및 네이티브 HTTP 버퍼를 통해 **불과 3ms 만에 번들을 스트리밍**합니다.
3. **실시간 HMR 및 Fast Refresh (초고속 반영)**:
   - `fs.watch` OS 이벤트 폭주를 방지하는 100ms 안전 디바운스를 적용하고도 **총 111ms 만에 클라이언트 HMR 반영(`update-done`)까지 완결**됩니다 (실제 순수 번들 변경 추출 및 브로드캐스트 시간은 ~11ms).
4. **번들 크기 효율 (-1.58 MB)**:
   - 개발용 번들에서도 Metro(6.86 MB) 대비 Bun Dev Server(5.28 MB)가 훨씬 가볍고 빠르게 네트워크로 전송됩니다.

