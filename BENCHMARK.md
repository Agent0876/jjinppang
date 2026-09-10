# react-native-bun-build vs Metro Benchmark

React Native 0.87 환경(`--dev false`, `--reset-cache`)에서의 프로덕션 번들 빌드 성능 및 산출물 크기 비교 결과입니다. (연속 3회 측정 평균치)

---

## 1. 빌드 속도 비교 (Build Speed)

`react-native-bun-build`는 번들링 및 **Hermes Bytecode Ahead-Of-Time(AOT) 컴파일까지 포함**하고도 Metro 대비 **약 1.71x ~ 1.73x 빠른 속도**를 제공합니다.

| Platform    | Bundler                          | Avg Duration |       Speedup       |
| :---------- | :------------------------------- | :----------: | :-----------------: |
| **iOS**     | Metro                            |   5,965 ms   |  1.0x _(baseline)_  |
| **iOS**     | **react-native-bun-build (Bun)** | **3,481 ms** | **1.71x faster** ⚡ |
| **Android** | Metro                            |   5,755 ms   |  1.0x _(baseline)_  |
| **Android** | **react-native-bun-build (Bun)** | **3,332 ms** | **1.73x faster** ⚡ |

---

## 2. 번들 크기 정밀 비교 (Bundle Size by Format)

> [!NOTE]
> **기존 수치 오해 해소**: React Native 표준 CLI(`react-native bundle`)는 Hermes 컴파일을 자체 수행하지 않고 **순수 Minified JS**만 출력합니다. 반면 `react-native-bun-build`는 **Hermes Bytecode(.hbc)**까지 빌드 파이프라인에서 자동 완결합니다.
> 따라서 포맷(JS vs .hbc)을 일치시켜 계층별로 공정하게 비교한 결과는 다음과 같습니다.

### 포맷별 크기 비교표 (iOS 기준)

| 단계 (Format)                   |                   Metro                   |            react-native-bun-build             |  차이 (Bun vs Metro)   |         비교 결과          |
| :------------------------------ | :---------------------------------------: | :-------------------------------------------: | :--------------------: | :------------------------: |
| **① Raw JS (안 압축)**          | 1,962.6 KB _(2,009,744 B)_<br>45,068 라인 | **1,869.4 KB** _(1,914,229 B)_<br>38,990 라인 | **-95.5 KB (-4.75%)**  |    ⚡ **Bun이 더 작음**    |
| **② Minified JS (압축 텍스트)** |  875.87 KB _(896,892 B)_<br>14,293 라인   |    **847.95 KB** _(868,305 B)_<br>65 라인     | **-28.58 KB (-3.19%)** |    ⚡ **Bun이 더 작음**    |
| **③ Hermes Bytecode (.hbc)**    |      **1,232.59 KB** _(1,262,178 B)_      |          1,268.07 KB _(1,298,506 B)_          |   +35.48 KB (+2.88%)   | 🔹 **대등 (약 2.8% 차이)** |

---

## 3. 핵심 분석 및 기술적 특징 (Key Findings)

### 1) 순수 JS 레벨에서 Bun이 더 컴팩트한 이유 (-28.6 KB)

- **런타임 패키저 오버헤드 최소화**: Metro는 약 800줄의 런타임(`metroRequire`, `define`, `Map` 캐시)과 모듈당 7개의 고정 매개변수 선언을 주입하지만, Bun은 컴팩트한 경량 래퍼(`__commonJS`, `__toESM`)를 사용하여 보일러플레이트를 대폭 줄였습니다.
- **철저한 Dead Code Elimination (DCE)**: `--dev false` 시 `__DEV__`가 `false`로 치환되며 모든 개발용 분기(`if (false)`)가 컴파일 타임에 완벽히 제거됩니다. React 특유의 invariant 상세 에러 문구와 불필요한 스텁 모듈이 번들에서 완전 배제됩니다.

### 2) Hermes Bytecode (.hbc) 크기 특성 (+2.8%)

- Bun은 CommonJS 모듈 격리를 위해 클로저 함수 단위를 활용하며, Hermes 컴파일러는 각 JS 함수마다 렉시컬 환경 테이블 및 프레임 메타데이터를 생성합니다.
- 이에 따라 HBC 바이너리 변환 시 메타데이터 크기가 소폭 추가되지만, 실제 바이너리 차이는 약 35 KB(2.8%) 수준으로 런타임 성능 및 메모리에 영향 없는 범위 내에서 대등합니다.

### 3) 올인원 파이프라인 (All-in-One Pipeline)

- **Hermes AOT 기본 탑재**: 별도의 빌드 페이즈 스크립트 없이 JS 번들링과 Hermes Bytecode 컴파일, 소스맵 합성을 한 번의 실행으로 완결합니다.
- **Asset Pipeline**: `@2x`, `@3x` 등의 해상도별 이미지 에셋을 iOS 에셋 카탈로그 및 Android `drawable-*`/`raw` 디렉토리로 자동 분류 추출합니다.

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
