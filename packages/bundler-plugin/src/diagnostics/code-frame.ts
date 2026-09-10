import fs from 'node:fs';
import type { CodeFrame } from '../types.js';

/**
 * Generates an ANSI / formatted code frame around a specific line and column in a source file
 */
export function generateCodeFrame(
  filePath: string,
  line: number,
  column: number,
  linesAround: number = 2
): CodeFrame | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    if (line < 1 || line > lines.length) return null;

    const start = Math.max(1, line - linesAround);
    const end = Math.min(lines.length, line + linesAround);
    const maxLineNumWidth = String(end).length;

    const formattedLines: string[] = [];
    for (let l = start; l <= end; l++) {
      const isTarget = l === line;
      const marker = isTarget ? '>' : ' ';
      const lineNumStr = String(l).padStart(maxLineNumWidth, ' ');
      const lineContent = lines[l - 1] ?? '';
      formattedLines.push(`${marker} ${lineNumStr} | ${lineContent}`);

      if (isTarget) {
        const indent = ' '.repeat(marker.length + 1 + maxLineNumWidth + 3 + Math.max(0, column));
        formattedLines.push(`${indent}^`);
      }
    }

    return {
      content: formattedLines.join('\n'),
      location: { row: line, column },
      fileName: filePath,
    };
  } catch {
    return null;
  }
}
