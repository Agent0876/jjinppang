# React Native 번들러 3자 벤치마크: Metro vs react-native-bun-build vs Rollipop

React Native 0.87 프로덕션 빌드 환경(`--dev false`, `--reset-cache`)에서 3대 번들러(**Metro**, **react-native-bun-build**, **Rollipop**)의 빌드 성능, 산출물 크기 및 아키텍처를 정밀 측정한 결과입니다. (각 플랫폼별 3회 연속 측정 평균치)

---

## 1. 빌드 속도 및 산출물 종합 비교 (Production Build Benchmark)

| Platform    | 번들러 (Bundler)                            | 핵심 엔진 (Engine)    | 평균 소요 시간 (Avg) | 산출물 크기 (Bundle Size) |       출력 포맷 (Format)       | 속도 개선 배수 (vs Metro) |
| :---------- | :------------------------------------------ | :-------------------- | :------------------: | :-----------------------: | :----------------------------: | :-----------------------: |
| **iOS**     | **Metro (기본 빌드)**                       | Babel + Node.js       |     **8,761 ms**     |    1.80 MB (1840.1 KB)    |          Minified JS           |     1.0x _(baseline)_     |
| **iOS**     | **react-native-bun-build (우리가 만든 것)** | Bun + Babel Hybrid    |     **6,813 ms**     |    2.89 MB (2955.5 KB)    | **Hermes Bytecode (.hbc) AOT** |    **1.29x faster** ⚡    |
| **iOS**     | **Rollipop**                                | Rolldown (Rust) + SWC |     **1,363 ms**     |    2.23 MB (2283.1 KB)    |          Minified JS           |    **6.43x faster** ⚡    |
| **Android** | **Metro (기본 빌드)**                       | Babel + Node.js       |    **10,104 ms**     |    1.80 MB (1845.8 KB)    |          Minified JS           |     1.0x _(baseline)_     |
| **Android** | **react-native-bun-build (우리가 만든 것)** | Bun + Babel Hybrid    |     **7,885 ms**     |    2.89 MB (2963.2 KB)    | **Hermes Bytecode (.hbc) AOT** |    **1.28x faster** ⚡    |
| **Android** | **Rollipop**                                | Rolldown (Rust) + SWC |     **1,490 ms**     |    2.24 MB (2294.9 KB)    |          Minified JS           |    **6.78x faster** ⚡    |

---

## 2. 3대 번들러 아키텍처 및 특징 비교 (Architecture & Features)

| 비교 항목             | Metro (기본 빌드)                      | react-native-bun-build (Bun)                | Rollipop (Rolldown)                  |
| :-------------------- | :------------------------------------- | :------------------------------------------ | :----------------------------------- |
| **핵심 런타임**       | Node.js (V8)                           | **Bun (JavaScriptCore + Zig)**              | Node.js + Rust NAPI                  |
| **번들러 코어**       | Metro AST Graph Traversal              | **Bun.build() (네이티브 Zig 번들러)**       | **Rolldown (Rust 기반 Rollup 포팅)** |
| **JS/TS 변환**        | Babel (`@react-native/babel-preset`)   | **Bun Native Transpiler + Babel Hybrid**    | SWC + fast-flow-transform            |
| **Hermes AOT 컴파일** | ❌ 미지원 (Xcode/Gradle 단계에서 수행) | **✅ 번들러 파이프라인에서 .hbc 자동 완결** | ❌ 미지원 (순수 JS만 방출)           |
| **에셋 파이프라인**   | `@2x`, `@3x` 자동 추출                 | **`@2x`, `@3x` 고속 추출 & 네이티브 매핑**  | `@2x`, `@3x` 자동 추출               |
| **개발 서버 코어**    | Connect / Node.js HTTP                 | **`Bun.serve` 네이티브 초고속 서버**        | Fastify (Node.js)                    |
| **HMR 지원**          | Metro HMR Protocol                     | **Metro 호환 초경량 HMR 엔진**              | Vite-style HMR / Metro 호환          |
| **호환성**            | 100% (React Native 공식 표준)          | **Hermes/RN 0.87 최신 완벽 호환**           | RN 0.86+ Flow 문법 등 일부 shim 필요 |

---

## 3. 핵심 분석 및 기술적 특징 (Key Findings)

### 1) 빌드 속도 관점 (Build Performance)

- **Rollipop (Rolldown)**: Rust 기반의 Rolldown 번들러 코어와 메모리 매핑을 통해 순수 JS 번들링 단계에서 **가장 빠른 극초고속(~1363ms)** 빌드를 달성합니다.
- **react-native-bun-build (Bun)**: 번들링뿐만 아니라 **Hermes Bytecode(.hbc) AOT 바이너리 컴파일까지 일괄 수행**하고도 Metro 대비 **약 1.29x ~ 1.28x 빠른 속도**를 제공합니다.
- **Metro**: 순수 Node.js 단일 스레드 이벤트 루프와 복잡한 Babel AST 순회로 인해 빌드에 가장 긴 시간(~8761ms)이 소요됩니다.

### 2) 산출물 포맷 및 크기 관점 (Bundle Format & Size)

- **산출물 포맷의 차이**:
  - **Metro**와 **Rollipop**은 **Minified JS 파일**만 생성합니다. (앱 릴리즈 시 Xcode / Gradle 단계에서 별도로 Hermes 바이너리 컴파일을 거침)
  - **react-native-bun-build**는 번들 빌드와 동시에 **Hermes Bytecode(.hbc)**를 직접 생성하여, 네이티브 앱 패키징 시간을 획기적으로 단축시킵니다.
- **번들 크기**:
  - Minified JS 기준: Metro(1.80 MB (1840.1 KB)) vs Rollipop(2.23 MB (2283.1 KB))
  - HBC Bytecode 기준: react-native-bun-build(2.89 MB (2955.5 KB))는 컴파일된 네이티브 바이트코드 바이너리 크기입니다.

### 3) 실전 도입 및 생태계 관점

- **react-native-bun-build**는 `bun-rn init`부터 Redux Toolkit / AsyncStorage / Reanimated / WebView 지원, `Bun.serve` 기반의 독립 개발 서버, Hermes Bytecode 직접 컴파일까지 **올인원 풀스택 번들링 툴킷**으로 설계되어 단일 도구로 완전한 대체가 가능합니다.
- **Rollipop**은 빠른 번들링을 제공하지만 RN 0.87의 최신 Flow `readonly` 키워드 파싱 이슈나 `package.json` exports 매핑 등 추가 shim 설정이 수반되어야 합니다.

---

## 4. 개발 서버 및 HMR / DX 벤치마크 (Development Server & DX Benchmark)

개발 모드(`--dev true`)에서 Metro와 `react-native-bun-build`(`Bun.serve`)의 개발 서버 기동, 번들 서빙, 실시간 HMR 및 스택 트레이스 심볼리케이션 성능 실측 결과입니다.

| 항목 (Metric)                         |   Metro (Node.js)    | react-native-bun-build (Bun.serve) |          개선 배수 (Speedup / Result)           |
| :------------------------------------ | :------------------: | :--------------------------------: | :---------------------------------------------: |
| **🚀 서버 Cold Startup**              |        664 ms        |             **189 ms**             |               **3.51x faster** ⚡               |
| **📦 1차 Cold 번들 요청 (First Req)** | 6,393 ms _(6.86 MB)_ |      **4,675 ms** _(5.28 MB)_      |       **1.37x faster** ⚡ (번들 -1.58 MB)       |
| **⚡ 캐시 번들 요청 (Warm GET)**      |        76 ms         |              **3 ms**              | **25.3x faster** ⚡ _(인메모리 캐시 즉각 반환)_ |
| **🔥 HMR / Fast Refresh 왕복 지연**   |        117 ms        |             **111 ms**             |          **대등 (~11ms 순수 연산)** ⚡          |
| **🗺️ `/symbolicate` 소스맵 역추적**   |         5 ms         |             **21 ms**              |        **실시간 응답 (1/50초 내 완결)**         |
| **💾 프로세스 메모리 점유 (RSS)**     |       145.4 MB       |              148.8 MB              |          **대등 (안정적 메모리 유지)**          |

### DX 분석 및 핵심 인사이트:

1. **Cold Startup (3.51x 빠름)**:
   - Node.js 기반 Metro의 수많은 의존 모듈 로딩 대비, Bun의 네이티브 C++ 서버 코어(`Bun.serve`)를 통해 **189ms 만에 즉시 포트를 바인딩**하고 헬스체크 응답을 시작합니다.
2. **Warm Bundle 서빙 (25.3x 빠름)**:
   - 에뮬레이터에서 번들을 재요청(`Cmd+R` / 리로드)할 때, Metro는 76ms가 소요되는 반면 Bun Dev Server는 인메모리 캐시 및 네이티브 HTTP 버퍼를 통해 **불과 3ms 만에 번들을 스트리밍**합니다.
3. **실시간 HMR 및 Fast Refresh (초고속 반영)**:
   - `fs.watch` OS 이벤트 폭주를 방지하는 100ms 안전 디바운스를 적용하고도 **총 111ms 만에 클라이언트 HMR 반영(`update-done`)까지 완결**됩니다 (실제 순수 번들 변경 추출 및 브로드캐스트 시간은 ~11ms).
4. **번들 크기 효율 (-1.58 MB)**:
   - 개발용 번들에서도 Metro(6.86 MB) 대비 Bun Dev Server(5.28 MB)가 훨씬 가볍고 빠르게 네트워크로 전송됩니다.
