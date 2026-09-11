# React Native 번들러 3자 벤치마크: Metro vs 찐빵 (jjinppang) vs Rollipop

React Native 0.87 프로덕션 빌드 환경(`--dev false`)에서 3대 번들러(**Metro**, **찐빵 (jjinppang)**, **Rollipop**)의 빌드 성능, 산출물 크기 및 아키텍처를 정밀 측정한 결과입니다. (각 플랫폼별 3회 연속 측정 평균치)

---

## 1. 정규화된 빌드 속도 및 산출물 종합 비교 (Production Build Benchmark)

> [!IMPORTANT]
> **공정한 번들 크기 정규화 기준 (Fair Apple-to-Apple Comparison)**
>
> - **순수 JS 크기 (Minified JS)**: 번들러가 생성한 텍스트 산출물 크기 (Babel/Bun/Rolldown 번들링 직후 크기)
> - **Hermes 바이트코드 (.hbc)**: 동일한 React Native 공식 Hermes 컴파일러(`hermesc -emit-binary -O`)로 컴파일한 실제 네이티브 런타임 AOT 바이너리 크기
> - 모든 번들러의 결과물을 **1) JS 대 JS**, **2) HBC 대 HBC**로 동일한 조건에서 교차 비교하여 포맷 불일치로 인한 오해를 배제하였습니다.

| Platform    | 번들러 (Bundler)                  | 핵심 엔진 (Engine)          | 전체 빌드 시간 (Avg) | 순수 JS 크기 (Minified JS) | Hermes 바이트코드 (.hbc) | 바이트코드 변환율 (HBC/JS) |   속도 개선 배수 (vs Metro)    |
| :---------- | :-------------------------------- | :-------------------------- | :------------------: | :------------------------: | :----------------------: | :------------------------: | :----------------------------: |
| **iOS**     | **Metro (기본 빌드)**             | Babel + Node.js             |     **9,356 ms**     |    1.80 MB (1840.1 KB)     |   2.32 MB (2379.5 KB)    |           129.3%           |       1.0x _(baseline)_        |
| **iOS**     | **찐빵 (jjinppang - Cold)**       | Bun + Babel Hybrid          |     **4,487 ms**     |    1.21 MB (1241.6 KB)     | **1.32 MB (1347.3 KB)**  |           108.5%           |      **2.09x faster** ⚡       |
| **iOS**     | **찐빵 (jjinppang - Warm Cache)** | Bun + Persistent Disk Cache |     **1,938 ms**     |    1.21 MB (1241.6 KB)     | **1.32 MB (1347.3 KB)**  |           108.5%           | **4.83x faster** ⚡ _(최고속)_ |
| **iOS**     | **Rollipop**                      | Rolldown (Rust) + SWC       |     **2,550 ms**     |    2.23 MB (2283.1 KB)     | **1.53 MB (1567.2 KB)**  |           68.6%            |      **3.67x faster** ⚡       |
| **Android** | **Metro (기본 빌드)**             | Babel + Node.js             |     **8,880 ms**     |    1.80 MB (1845.8 KB)     |   2.33 MB (2386.3 KB)    |           129.3%           |       1.0x _(baseline)_        |
| **Android** | **찐빵 (jjinppang - Cold)**       | Bun + Babel Hybrid          |     **4,369 ms**     |    1.22 MB (1248.3 KB)     | **1.32 MB (1353.1 KB)**  |           108.4%           |      **2.03x faster** ⚡       |
| **Android** | **찐빵 (jjinppang - Warm Cache)** | Bun + Persistent Disk Cache |     **1,959 ms**     |    1.22 MB (1248.3 KB)     | **1.32 MB (1353.1 KB)**  |           108.4%           | **4.53x faster** ⚡ _(최고속)_ |
| **Android** | **Rollipop**                      | Rolldown (Rust) + SWC       |     **2,515 ms**     |    2.24 MB (2295.0 KB)     | **1.54 MB (1572.3 KB)**  |           68.5%            |      **3.53x faster** ⚡       |

---

## 2. 3대 번들러 아키텍처 및 특징 비교 (Architecture & Features)

| 비교 항목             | Metro (기본 빌드)                      | 찐빵 (jjinppang)                               | Rollipop (Rolldown)                  |
| :-------------------- | :------------------------------------- | :--------------------------------------------- | :----------------------------------- |
| **핵심 런타임**       | Node.js (V8)                           | **Bun (JavaScriptCore + Zig)**                 | Node.js + Rust NAPI                  |
| **번들러 코어**       | Metro AST Graph Traversal              | **Bun.build() (네이티브 Zig 번들러)**          | **Rolldown (Rust 기반 Rollup 포팅)** |
| **JS/TS 변환**        | Babel (`@react-native/babel-preset`)   | **Bun Native Transpiler + Babel Hybrid**       | SWC + fast-flow-transform            |
| **영구 디스크 캐시**  | `/tmp/metro-cache`                     | **`node_modules/.cache/jjinppang`**            | ❌ 미지원 (인메모리 전용)            |
| **Hermes AOT 컴파일** | ❌ 미지원 (Xcode/Gradle 단계에서 수행) | **✅ 번들러 파이프라인에서 .hbc 자동 완결**    | ❌ 미지원 (순수 JS만 방출)           |
| **순수 JS 번들 보존** | 기본 출력                              | **`[bundle-output].js` 자동 보존 & 크기 기록** | 기본 출력                            |
| **에셋 파이프라인**   | `@2x`, `@3x` 자동 추출                 | **`@2x`, `@3x` 고속 추출 & 네이티브 매핑**     | `@2x`, `@3x` 자동 추출               |
| **개발 서버 코어**    | Connect / Node.js HTTP                 | **`Bun.serve` 네이티브 초고속 서버**           | Fastify (Node.js)                    |
| **HMR 지원**          | Metro HMR Protocol                     | **Metro 호환 초경량 HMR 엔진**                 | Vite-style HMR / Metro 호환          |
| **호환성**            | 100% (React Native 공식 표준)          | **Hermes/RN 0.87 최신 완벽 호환**              | RN 0.86+ Flow 문법 등 일부 shim 필요 |

---

## 3. 핵심 분석 및 기술적 특징 (Key Findings)

### 1) 빌드 속도 관점 (Build Performance)

- **찐빵 (jjinppang - Warm Cache)**: 영구 디스크 캐시(`node_modules/.cache/jjinppang`)를 통해 **~1938ms**를 기록하며, **3대 번들러 중 압도적으로 가장 빠른 최고속 빌드**를 달성합니다 (Rollipop 대비 약 500ms 이상 더 빠름).
- **Rollipop (Rolldown)**: Rust 기반의 Rolldown 번들러 코어와 멀티스레드 SWC 트랜스파일을 통해 콜드 빌드 기준 극초고속(~2550ms)을 달성합니다.
- **찐빵 (jjinppang - Cold Build)**: 캐시가 전혀 없는 콜드 빌드 상태에서도 Hermes Bytecode(.hbc) AOT 컴파일까지 일괄 수행하고도 Metro 대비 **약 2.09x ~ 2.03x 빠른 속도**를 제공합니다.
- **Metro**: 순수 Node.js 단일 스레드 이벤트 루프와 복잡한 Babel AST 순회로 인해 빌드에 가장 긴 시간(~9356ms)이 소요됩니다.

### 2) 정규화된 산출물 크기 및 포맷 분석 (Normalized Size & Format Analysis)

#### A. 순수 Minified JS 비교 (JS 대 JS)

- **찐빵 (jjinppang)**: 약 1.21 MB (1241.6 KB) (가장 간결하고 가벼운 압축 산출물 달성)
- **Metro**: 약 1.80 MB (1840.1 KB)
- **Rollipop**: 약 2.23 MB (2283.1 KB)

#### B. Hermes Bytecode 비교 (.hbc 대 .hbc)

- **Rollipop (Rolldown)**: 약 **1.53 MB (1567.2 KB)** (JS 대비 약 **68.6%** 로 대폭 축소)
  - **이유 (Scope Hoisting의 위력)**: Rolldown은 Rollup 스타일의 스코프 호이스팅을 수행하여 수백 개의 개별 파일 모듈을 단일 최상위 렉시컬 스코프로 병합합니다. 모듈 팩토리 클로저 함수(`function(...) { ... }`)가 사라지므로, Hermes 컴파일러가 생성해야 하는 함수 환경 프레임, 함수 헤더 메타데이터, 옵코드 청크가 극적으로 줄어들어 바이트코드 크기가 30% 이상 감소합니다.
- **찐빵 (jjinppang)**: 약 **1.32 MB (1347.3 KB)** (Metro 대비 더 작은 바이트코드 달성!)
  - **이유 (지능형 Babel 위임 및 최적화 컴파일)**: 사전 컴파일된 패키지의 중복 worklet 트랜스폼 방지 및 `-fstrip-function-names`, `-fstatic-builtins` 최적화를 통해 Metro보다 작은 바이트코드 크기를 달성합니다.
- **Metro**: 약 **2.32 MB (2379.5 KB)** (JS 대비 약 **129.3%** 로 증가)

#### C. 결론 및 시사점

- `jjinppang`은 일상 개발 및 CI 환경에서 영구 디스크 캐시를 통해 **1초대 번들링(~1.9초)**을 제공하여 **롤리팝보다 빠른 실전 빌드 속도**를 제공합니다.
- 동시에 Hermes AOT 컴파일을 번들 파이프라인에서 즉시 완결하고, 디버깅 및 분석을 위해 `[bundle-output].js` 순수 JS 산출물까지 함께 보존하여 최상의 DX를 제공합니다.

### 3) 실전 도입 및 생태계 관점

- **찐빵 (jjinppang)**은 `jjinppang init`부터 Redux Toolkit / AsyncStorage / Reanimated / WebView 지원, `Bun.serve` 기반의 독립 개발 서버, Hermes Bytecode 직접 컴파일까지 **올인원 풀스택 번들링 툴킷**으로 설계되어 단일 도구로 완전한 대체가 가능합니다.
- **Rollipop**은 빠른 번들링을 제공하지만 RN 0.87의 최신 Flow `readonly` 키워드 파싱 이슈나 `package.json` exports 매핑 등 추가 shim 설정이 수반되어야 합니다.

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
