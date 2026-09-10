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
