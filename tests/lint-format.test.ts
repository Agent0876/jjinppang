import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findOxlintExecutable, lintCommand } from '../packages/cli/src/commands/lint.js';
import { findOxfmtExecutable, formatCommand } from '../packages/cli/src/commands/format.js';
import {
  lintCommandOptions,
  lintParseArgsConfig,
  formatCommandOptions,
  formatParseArgsConfig,
} from '../packages/cli/src/commands/options.js';
import { commands } from '../packages/cli/src/commands/index.js';
import { getCliVersion } from '../packages/cli/src/bin.js';

const TEST_DIR = path.join(__dirname, '.temp-lint-format-test');

describe('Built-in Lint & Format Commands (Next.js CLI Style)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('commands array exports lint, bun-lint, format, and bun-format commands', () => {
    const commandNames = commands.map((c) => c.name);
    expect(commandNames).toContain('lint');
    expect(commandNames).toContain('bun-lint');
    expect(commandNames).toContain('format');
    expect(commandNames).toContain('bun-format');

    const lintCmd = commands.find((c) => c.name === 'lint');
    expect(lintCmd?.func).toBe(lintCommand);
    expect(lintCmd?.options).toBe(lintCommandOptions);

    const formatCmd = commands.find((c) => c.name === 'format');
    expect(formatCmd?.func).toBe(formatCommand);
    expect(formatCmd?.options).toBe(formatCommandOptions);
  });

  test('lint and format option schemas define required flags', () => {
    const lintOptionNames = lintCommandOptions.map((o) => o.name);
    expect(lintOptionNames).toContain('--fix');
    expect(lintOptionNames).toContain('--config <path>');
    expect(lintOptionNames).toContain('--dir <path>');

    expect(lintParseArgsConfig.fix.type).toBe('boolean');
    expect(lintParseArgsConfig.config.type).toBe('string');
    expect(lintParseArgsConfig.help.type).toBe('boolean');

    const formatOptionNames = formatCommandOptions.map((o) => o.name);
    expect(formatOptionNames).toContain('--check');
    expect(formatOptionNames).toContain('--config <path>');
    expect(formatOptionNames).toContain('--dir <path>');

    expect(formatParseArgsConfig.check.type).toBe('boolean');
    expect(formatParseArgsConfig.config.type).toBe('string');
    expect(formatParseArgsConfig.help.type).toBe('boolean');
  });

  test('findOxlintExecutable locates local binary or falls back to bunx', () => {
    // In empty test dir without node_modules, should find node_modules from parent (this repo) or bunx
    const found = findOxlintExecutable(TEST_DIR);
    expect(['bunx', path.join(process.cwd(), 'node_modules/.bin/oxlint')]).toContain(found.cmd);

    // Mock local binary in TEST_DIR
    const localBinDir = path.join(TEST_DIR, 'node_modules/.bin');
    fs.mkdirSync(localBinDir, { recursive: true });
    const binName = process.platform === 'win32' ? 'oxlint.cmd' : 'oxlint';
    const mockBin = path.join(localBinDir, binName);
    fs.writeFileSync(mockBin, '#!/bin/sh\necho 1');

    const localFound = findOxlintExecutable(TEST_DIR);
    expect(localFound.cmd).toBe(mockBin);
    expect(localFound.prefixArgs).toEqual([]);
  });

  test('findOxfmtExecutable locates local binary or falls back to bunx', () => {
    const found = findOxfmtExecutable(TEST_DIR);
    expect(['bunx', path.join(process.cwd(), 'node_modules/.bin/oxfmt')]).toContain(found.cmd);

    // Mock local binary in TEST_DIR
    const localBinDir = path.join(TEST_DIR, 'node_modules/.bin');
    fs.mkdirSync(localBinDir, { recursive: true });
    const binName = process.platform === 'win32' ? 'oxfmt.cmd' : 'oxfmt';
    const mockBin = path.join(localBinDir, binName);
    fs.writeFileSync(mockBin, '#!/bin/sh\necho 1');

    const localFound = findOxfmtExecutable(TEST_DIR);
    expect(localFound.cmd).toBe(mockBin);
    expect(localFound.prefixArgs).toEqual([]);
  });

  test('lintCommand automatically generates .oxlintrc.json if missing (Next.js CLI behavior)', async () => {
    const oxlintrc = path.join(TEST_DIR, '.oxlintrc.json');
    expect(fs.existsSync(oxlintrc)).toBe(false);

    // Provide a valid clean file to lint so oxlint exits cleanly
    const sampleFile = path.join(TEST_DIR, 'index.ts');
    fs.writeFileSync(sampleFile, `export const answer = 42;\n`);

    // Mock local binary to succeed
    const localBinDir = path.join(TEST_DIR, 'node_modules/.bin');
    fs.mkdirSync(localBinDir, { recursive: true });
    const binName = process.platform === 'win32' ? 'oxlint.cmd' : 'oxlint';
    const mockBin = path.join(localBinDir, binName);
    fs.writeFileSync(mockBin, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(mockBin, 0o755);

    const exitCode = await lintCommand(['lint'], { root: TEST_DIR }, {});

    expect(fs.existsSync(oxlintrc)).toBe(true);
    const config = JSON.parse(fs.readFileSync(oxlintrc, 'utf8'));
    expect(config.plugins).toContain('typescript');
    expect(config.categories.correctness).toBe('error');
    expect(exitCode).toBe(0);
  });

  test('formatCommand automatically generates .oxfmtrc.json if missing', async () => {
    const oxfmtrc = path.join(TEST_DIR, '.oxfmtrc.json');
    expect(fs.existsSync(oxfmtrc)).toBe(false);

    // Mock local binary to succeed
    const localBinDir = path.join(TEST_DIR, 'node_modules/.bin');
    fs.mkdirSync(localBinDir, { recursive: true });
    const binName = process.platform === 'win32' ? 'oxfmt.cmd' : 'oxfmt';
    const mockBin = path.join(localBinDir, binName);
    fs.writeFileSync(mockBin, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(mockBin, 0o755);

    const exitCode = await formatCommand(['format'], { root: TEST_DIR }, {});

    expect(fs.existsSync(oxfmtrc)).toBe(true);
    const config = JSON.parse(fs.readFileSync(oxfmtrc, 'utf8'));
    expect(config.singleQuote).toBe(true);
    expect(config.tabWidth).toBe(2);
    expect(exitCode).toBe(0);
  });

  test('CLI binary supports bun-rn lint and bun-rn format with --help', () => {
    const cliBin = path.resolve(__dirname, '../packages/react-native-bun-build/bin/bun-rn.js');

    const lintHelp = spawnSync('bun', [cliBin, 'lint', '--help'], {
      encoding: 'utf8',
    });
    expect(lintHelp.status).toBe(0);
    expect(lintHelp.stdout).toContain('Usage: bun-rn lint');
    expect(lintHelp.stdout).toContain('--fix');

    const formatHelp = spawnSync('bun', [cliBin, 'format', '--help'], {
      encoding: 'utf8',
    });
    expect(formatHelp.status).toBe(0);
    expect(formatHelp.stdout).toContain('Usage: bun-rn format');
    expect(formatHelp.stdout).toContain('--check');
  });

  test('CLI dynamically reads version from package.json with --version and -v', () => {
    const pkgPath = path.resolve(__dirname, '../packages/react-native-bun-build/package.json');
    const expectedVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;

    expect(getCliVersion()).toBe(expectedVersion);

    const cliBin = path.resolve(__dirname, '../packages/react-native-bun-build/bin/bun-rn.js');

    const versionLong = spawnSync('bun', [cliBin, '--version'], {
      encoding: 'utf8',
    });
    expect(versionLong.status).toBe(0);
    expect(versionLong.stdout.trim()).toBe(`react-native-bun-build v${expectedVersion}`);

    const versionShort = spawnSync('bun', [cliBin, '-v'], {
      encoding: 'utf8',
    });
    expect(versionShort.status).toBe(0);
    expect(versionShort.stdout.trim()).toBe(`react-native-bun-build v${expectedVersion}`);
  });
});
