# Contributing to 🥟 찐빵 (jjinppang) 🤝

Thank you for your interest in contributing to `jjinppang`!  
This project aims to provide the fastest, modern, and developer-friendly bundler and toolkit for bare React Native applications, powered by Bun.

---

## 🏗 Monorepo Architecture

This repository is organized as a Bun workspaces monorepo:

```text
jjinppang/
├── packages/
│   ├── core/                      # Core bundler engine, Babel hybrid plugin, resolver, assets & Hermes compiler (@jjinppang/core)
│   ├── cli/                       # Standalone jjinppang CLI commands (init, start, bundle, test, lint, format) (@jjinppang/cli)
│   └── jjinppang/                 # Primary CLI binary & Community CLI plugin adapter (jjinppang)
├── fixtures/
│   └── TestApp/                   # Real-world bare React Native app used for E2E testing & benchmarking
├── scripts/                       # Build scripts, benchmarks, and maintenance automation
└── tests/                         # Comprehensive unit and integration test suites
```

---

## 🛠️ Prerequisites & Setup

### Requirements

- **[Bun](https://bun.sh)**: `>= 1.1.0` (Recommended: latest stable `bun`)
- **[Node.js](https://nodejs.org)**: `>= 20.0.0` (required for Hermes compiler tooling and native iOS/Android CLI shims)
- **Native Toolchain** _(optional, for running native apps)_:
  - **macOS / iOS**: Xcode `>= 15.0`, CocoaPods
  - **Android**: Android Studio & SDK (API 34+)

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/shinseungmin/jjinppang.git
cd jjinppang

# Install all workspace dependencies
bun install
```

### 2. Build Monorepo Packages

```bash
# Compiles all packages (core, cli, jjinppang)
bun run build
```

---

## 🧪 Testing & Quality Assurance

We maintain strict quality control using **[OXC (Oxidation Compiler)](https://oxc.rs)** and Bun's built-in test runner.

### Running Tests

```bash
# Run all unit and integration tests
bun test

# Run tests in watch mode
bun test --watch
```

### Linting & Formatting (OXC)

We use `oxlint` (up to 50-100x faster than ESLint) and `oxfmt` (Prettier-compatible high-speed formatter):

```bash
# Check lint issues
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Check formatting status
bun run format:check

# Auto-format all code
bun run format
```

### Complete Verification Pipeline

Before opening a pull request, run the single verification command:

```bash
bun run check
```

This automatically runs:

1. `oxlint`
2. `oxfmt --check`
3. `bun test tests/`

---

## 📊 Running Benchmarks

### 1. 3-Way Production Bundler Benchmark (Metro vs 찐빵 (jjinppang) vs Rollipop)

Measures multi-run production bundle times and bundle sizes for iOS and Android:

```bash
bun run benchmark
```

Results are automatically updated in [BENCHMARK.md](./BENCHMARK.md).

### 2. Development Server & DX Benchmark

Measures cold startup time, warm cached bundle serving, HMR latency, `/symbolicate` response, and process RSS memory:

```bash
bun run benchmark:dev
```

---

## 🌿 Git Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature (e.g., `feat(cli): add interactive Redux Toolkit prompt`)
- `fix:` A bug fix (e.g., `fix(hermes): remove deprecated compiler flag`)
- `perf:` A code change that improves performance
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `docs:` Documentation changes only
- `test:` Adding or updating tests
- `chore:` Changes to the build process or auxiliary tools

---

## 📦 Changesets & Release Workflow

We use `@changesets/cli` for versioning and publishing packages:

1. When your PR introduces user-facing changes, generate a changeset:
   ```bash
   bun run changeset
   ```
2. Follow the prompt to select changed packages (`patch`, `minor`, or `major`) and provide a clear summary.
3. Commit the generated markdown file in `.changeset/`.

---

## 💡 Community & Discussions

- **Bug Reports**: Open an issue describing steps to reproduce, environment information (`jjinppang doctor`), and minimal reproducible example.
- **Feature Requests**: We welcome ideas! Open an issue or discussion detailing the use-case and proposal.

Thank you for making `jjinppang` faster and better for the entire React Native community! 🥟🚀
