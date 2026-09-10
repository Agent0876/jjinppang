import readline from 'node:readline';
import { colors, symbols } from './colors.js';

export function renderHeader(): void {
  console.log(`
${colors.brightCyan}┌─────────────────────────────────────────────────────────────┐${colors.reset}
${colors.brightCyan}│${colors.reset}  ${colors.bold}${colors.brightYellow}⚡ react-native-bun-build${colors.reset} ${colors.dim}v0.1.0${colors.reset}                           ${colors.brightCyan}│${colors.reset}
${colors.brightCyan}│${colors.reset}  ${colors.dim}Next-generation Ultra-fast Bun Bundler for React Native${colors.reset}    ${colors.brightCyan}│${colors.reset}
${colors.brightCyan}└─────────────────────────────────────────────────────────────┘${colors.reset}
`);
}

export interface MultiSelectOption<T> {
  label: string;
  value: T;
  hint?: string;
  selected?: boolean;
}

interface KeyPressEvent {
  sequence?: string;
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

/**
 * Interactive Checkbox Multi-Selection Prompt
 * - Arrow Up / Down (or j / k) to navigate
 * - Space to toggle selection
 * - 'a' to toggle all
 * - Enter to confirm
 */
export async function promptMultiSelect<T>(
  question: string,
  options: MultiSelectOption<T>[],
  minSelected = 1
): Promise<T[]> {
  // Non-interactive / CI / non-TTY fallback
  if (!process.stdin.isTTY || process.env.CI) {
    const selected = options.filter((o) => o.selected !== false).map((o) => o.value);
    return selected.length > 0 ? selected : options.map((o) => o.value);
  }

  const selectedState = options.map((o) => Boolean(o.selected));
  let cursor = 0;
  let hasRendered = false;

  const render = () => {
    if (hasRendered) {
      readline.moveCursor(process.stdout, 0, -options.length);
    } else {
      console.log(
        `${symbols.arrow} ${colors.bold}${question}${colors.reset} ${colors.dim}(Space to toggle, Enter to confirm)${colors.reset}`
      );
      hasRendered = true;
    }

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const isCurrent = i === cursor;
      const isChecked = selectedState[i];

      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);

      const pointer = isCurrent ? `${colors.brightCyan}❯${colors.reset} ` : '  ';
      const checkbox = isChecked
        ? `${colors.brightGreen}[✔]${colors.reset}`
        : `${colors.dim}[ ]${colors.reset}`;
      const label = isCurrent
        ? `${colors.bold}${colors.brightWhite}${opt.label}${colors.reset}`
        : opt.label;
      const hint = opt.hint ? `  ${colors.dim}• ${opt.hint}${colors.reset}` : '';

      process.stdout.write(`${pointer}${checkbox} ${label}${hint}\n`);
    }
  };

  return new Promise<T[]>((resolve) => {
    process.stdout.write('\x1b[?25l'); // Hide terminal cursor

    readline.emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    render();

    const cleanup = () => {
      process.stdout.write('\x1b[?25h'); // Restore cursor
      if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(Boolean(wasRaw));
      }
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.pause();
    };

    const onKeypress = (str: string, key: KeyPressEvent) => {
      const isUp = key?.name === 'up' || key?.name === 'k';
      const isDown = key?.name === 'down' || key?.name === 'j';
      const isSpace = key?.name === 'space' || str === ' ';
      const isAll = key?.name === 'a' || str === 'a';
      const isEnter =
        key?.name === 'return' || key?.name === 'enter' || str === '\r' || str === '\n';
      const isCtrlC = (key?.ctrl && key?.name === 'c') || str === '\u0003';

      if (isCtrlC) {
        cleanup();
        process.exit(130);
      }

      if (isUp) {
        cursor = cursor === 0 ? options.length - 1 : cursor - 1;
        render();
        return;
      }

      if (isDown) {
        cursor = cursor === options.length - 1 ? 0 : cursor + 1;
        render();
        return;
      }

      if (isSpace) {
        selectedState[cursor] = !selectedState[cursor];
        render();
        return;
      }

      if (isAll) {
        const allSelected = selectedState.every(Boolean);
        for (let i = 0; i < selectedState.length; i++) {
          selectedState[i] = !allSelected;
        }
        render();
        return;
      }

      if (isEnter) {
        const chosenIndices = selectedState
          .map((s, idx) => (s ? idx : -1))
          .filter((idx) => idx !== -1);

        if (chosenIndices.length < minSelected) {
          return;
        }

        cleanup();

        // Collapse prompt into a clean summary line
        readline.moveCursor(process.stdout, 0, -(options.length + 1));
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);

        const chosenOptions = chosenIndices.map((i) => options[i]);
        const chosenValues = chosenOptions.map((o) => o.value);
        const displayLabels = chosenOptions.map((o) => o.label).join(', ');

        console.log(
          `${symbols.check} ${colors.bold}${question}${colors.reset} ${colors.brightCyan}› ${displayLabels}${colors.reset}\n`
        );

        resolve(chosenValues);
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

/**
 * Ask a free-text question
 */
export async function promptText(question: string, defaultValue = ''): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const displayDefault = defaultValue
    ? ` ${colors.dim}(default: ${defaultValue})${colors.reset}`
    : '';
  const promptStr = `${symbols.arrow} ${colors.bold}${question}${colors.reset}${displayDefault}: `;

  return new Promise((resolve) => {
    rl.question(promptStr, (answer) => {
      rl.close();
      const result = answer.trim() || defaultValue;
      console.log(`  ${symbols.check} ${colors.dim}${result}${colors.reset}\n`);
      resolve(result);
    });
  });
}

/**
 * Single-choice prompt selection
 */
export async function promptSelect<T>(
  question: string,
  options: { label: string; value: T; hint?: string }[],
  defaultIndex = 0
): Promise<T> {
  console.log(`${symbols.arrow} ${colors.bold}${question}${colors.reset}`);

  options.forEach((opt, idx) => {
    const isDefault = idx === defaultIndex;
    const num = `${colors.cyan}${idx + 1}${colors.reset}`;
    const tag = isDefault ? ` ${colors.brightGreen}(recommended)${colors.reset}` : '';
    const hint = opt.hint ? ` ${colors.dim}-${opt.hint}${colors.reset}` : '';
    console.log(`    ${num}. ${opt.label}${tag}${hint}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `  ${colors.dim}Choose [1-${options.length}] (default: ${defaultIndex + 1}): ${colors.reset}`,
      (answer) => {
        rl.close();
        const trimmed = answer.trim();
        let selectedIndex = defaultIndex;
        if (trimmed) {
          const parsed = parseInt(trimmed, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= options.length) {
            selectedIndex = parsed - 1;
          }
        }

        const chosen = options[selectedIndex] ?? options[defaultIndex];
        console.log(`  ${symbols.check} ${colors.dim}${chosen.label}${colors.reset}\n`);
        resolve(chosen.value);
      }
    );
  });
}

/**
 * Yes / No confirmation prompt
 */
export async function promptConfirm(question: string, defaultYes = true): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const choicesStr = defaultYes ? `[Y/n]` : `[y/N]`;
  const promptStr = `${symbols.arrow} ${colors.bold}${question}${colors.reset} ${colors.dim}${choicesStr}${colors.reset} `;

  return new Promise((resolve) => {
    rl.question(promptStr, (answer) => {
      rl.close();
      const val = answer.trim().toLowerCase();
      let result = defaultYes;
      if (val === 'y' || val === 'yes') {
        result = true;
      } else if (val === 'n' || val === 'no') {
        result = false;
      }

      console.log(`  ${symbols.check} ${colors.dim}${result ? 'Yes' : 'No'}${colors.reset}\n`);
      resolve(result);
    });
  });
}
