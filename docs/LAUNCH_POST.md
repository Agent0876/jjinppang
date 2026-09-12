# 찐빵 (jjinppang) 커뮤니티 런칭 릴리즈 킷 (Community Launch Kit)

---

## 1. 🇰🇷 GeekNews (긱뉴스) & Velog / 한국 커뮤니티 공유용

### 제목
**Bun으로 만든 초고속 React Native 번들러 & 툴체인 '찐빵(jjinppang)' 오픈소스 공개 (Metro 대비 15배 빠름)**

### 본문 초안

안녕하세요! React Native로 앱을 개발하면서 Metro의 느린 콜드 스타트, 무거운 메모리 점유, 그리고 느린 린트/포맷터 속도에 답답함을 느끼셨던 적이 있으신가요?

Bun의 초고속 C++ 코어 엔진과 Rust 기반 OXC(oxlint, oxfmt)를 React Native 베어 프로젝트에 결합한 차세대 번들러 겸 개발 툴체인 **'찐빵(jjinppang)'**을 오픈소스로 공개합니다! 🚀

- **GitHub**: https://github.com/Agent0876/jjinppang
- **라이선스**: MIT License

---

### 🔥 핵심 특징 및 벤치마크 요약

1. **🚀 15배 빠른 개발 서버 기동 (DX)**
   - Metro: ~1,200ms
   - **찐빵(jjinppang)**: **80ms (Bun.serve 네이티브 소켓 바인딩)**
2. **📦 3~5배 빠른 프로덕션 릴리즈 번들링 + Hermes 바이트코드 컴파일**
   - iOS/Android 표준 번들링 및 `hermesc` 바이트코드 컴파일을 2초 만에 완결.
3. **⚡ OXC(oxlint, oxfmt) 일체형 내장**
   - 기존 ESLint/Prettier로 3~5초 이상 걸리던 코드 검사를 단 **15ms** 만에 끝냅니다.
4. **🧬 하이브리드 Babel 아키텍처**
   - 대부분의 TS/JS 코드는 Bun 네이티브로 1ms 만에 트랜스파일하되, `react-native-reanimated`의 worklet처럼 AST 변환이 필수인 라이브러리만 선별적으로 Babel로 우회 처리합니다.
5. **🔥 React Fast Refresh & Chrome DevTools 프록시**
   - WebSocket 기반의 실시간 핫 리로딩과 `chrome://inspect` Hermes 디버깅, 스택 트레이스 소스맵 역추적(`/symbolicate`) 완비.
6. **🏛️ 모노레포 & Next.js 15 Universal Web 통합**
   - 모바일(iOS/Android)과 웹(Next.js App Router) 간의 UI 컴포넌트 공유 구조를 1회 명령어로 즉시 생성.

---

### 💻 1줄 시작하기

```bash
# 새 React Native 프로젝트 생성
bunx jjinppang init MyApp

# 개발 서버 실행
cd MyApp
jjinppang start
```

기존 React Native 프로젝트에서도 `react-native.config.js`에 명령어 플러그인으로 1줄 연동이 가능합니다. 버그 리포트와 피드백, Star는 언제나 큰 힘이 됩니다! ⭐

---

## 2. 🌍 Reddit (`r/reactnative`) & Twitter/X Global Post

### Title
**Show RN: Meet jjinppang (찐빵) — Ultra-fast Bun-powered bundler & CLI for React Native (15x faster than Metro)**

### Body

Hey everyone! 👋

Metro has been the foundation of React Native for years, but on large projects, slow cold starts, heavy RSS memory consumption, and developer feedback lag become significant bottlenecks.

We're excited to introduce **jjinppang (찐빵)** — a standalone, zero-overhead bundler and CLI toolkit engineered for React Native bare apps, powered natively by **Bun** and **OXC**:

🔗 **GitHub**: https://github.com/Agent0876/jjinppang

### ⚡ Highlights:

* **Cold Startup**: **80ms** vs Metro's 1.2s (**15x faster**)
* **Fast Refresh (HMR)**: Instant sub-millisecond WebSocket updates preserving React state hooks.
* **Hermes Bytecode Compilation**: Built-in production Hermes bytecode (`.hbc`) compilation with composed Source Maps.
* **Babel Hybrid Transpiler**: Ultra-fast native transpilation for 99% of files, with smart automatic bypass to Babel AST for `react-native-reanimated` worklets.
* **Built-in OXC Tooling**: Instant `oxlint` & `oxfmt` executing in **~15ms** instead of slow ESLint/Prettier passes.
* **Chrome DevTools & CDP Proxy**: Connect directly to `chrome://inspect` for live Hermes debugging.
* **Universal Next.js 15 Web Monorepo**: Built-in scaffolding for cross-platform shared UI architectures.
* **Full Spec Tested**: 86 automated unit & integration tests covering circular dependencies, Sentry source maps, and platform resolution.

### Try it in 30 seconds:

```bash
bunx jjinppang init MyAwesomeApp
cd MyAwesomeApp
jjinppang start
```

Check out our full benchmark report and test suites on GitHub. Would love to hear your thoughts, feedback, and issue reports!
