import fs from 'node:fs';
import path from 'node:path';
import { SourceMapConsumer } from 'source-map-js';
import type { CodeFrame, StackFrame, SymbolicateRequest, SymbolicateResponse } from './types.js';

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

/**
 * Symbolicator for resolving bundle stack traces back to source files using sourcemaps
 */
export class Symbolicator {
  private consumers: Map<string, SourceMapConsumer> = new Map();
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  /**
   * Registers a sourcemap for a specific URL or key
   */
  registerSourceMap(key: string, rawMap: string | object): void {
    const mapObj = typeof rawMap === 'string' ? JSON.parse(rawMap) : rawMap;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consumer = new SourceMapConsumer(mapObj as any);
    this.consumers.set(key, consumer);

    try {
      const parsed = new URL(key);
      this.consumers.set(parsed.pathname, consumer);
    } catch {
      // Not a full URL
    }
  }

  /**
   * Finds the consumer matching the requested file URL or path
   */
  getConsumerForUrl(fileUrl: string): SourceMapConsumer | null {
    if (this.consumers.has(fileUrl)) return this.consumers.get(fileUrl)!;

    try {
      const parsed = new URL(fileUrl);
      if (this.consumers.has(parsed.pathname)) {
        return this.consumers.get(parsed.pathname)!;
      }
      const basename = path.basename(parsed.pathname);
      for (const [k, v] of this.consumers.entries()) {
        if (k.endsWith(basename)) return v;
      }
    } catch {
      // Not a URL
    }

    // Default to the first available consumer if single entry
    if (this.consumers.size === 1) {
      return this.consumers.values().next().value ?? null;
    }

    return null;
  }

  /**
   * Symbolicates an individual stack frame
   */
  symbolicateFrame(frame: StackFrame): StackFrame {
    if (!frame.file || frame.lineNumber == null) {
      return frame;
    }

    const consumer = this.getConsumerForUrl(frame.file);
    if (!consumer) {
      return frame;
    }

    const pos = consumer.originalPositionFor({
      line: frame.lineNumber,
      column: frame.column ?? 0,
    });

    if (!pos || !pos.source || pos.line == null) {
      return frame;
    }

    let resolvedSource = pos.source;
    if (resolvedSource.startsWith('file://')) {
      resolvedSource = resolvedSource.slice(7);
    }
    if (!path.isAbsolute(resolvedSource)) {
      resolvedSource = path.resolve(this.projectRoot, resolvedSource);
    }

    const isNodeModules = resolvedSource.includes('/node_modules/');

    return {
      file: resolvedSource,
      lineNumber: pos.line,
      column: pos.column,
      methodName: pos.name || frame.methodName,
      collapse: isNodeModules,
    };
  }

  /**
   * Symbolicates a full stack trace and computes code frame
   */
  symbolicate(request: SymbolicateRequest): SymbolicateResponse {
    const symbolicatedStack = request.stack.map((frame) => this.symbolicateFrame(frame));

    let targetFrame: StackFrame | null = null;
    for (const frame of symbolicatedStack) {
      if (!frame.collapse && frame.file && frame.lineNumber != null && fs.existsSync(frame.file)) {
        targetFrame = frame;
        break;
      }
    }

    if (!targetFrame) {
      for (const frame of symbolicatedStack) {
        if (frame.file && frame.lineNumber != null && fs.existsSync(frame.file)) {
          targetFrame = frame;
          break;
        }
      }
    }

    let codeFrame: CodeFrame | null = null;
    if (targetFrame && targetFrame.file && targetFrame.lineNumber != null) {
      codeFrame = generateCodeFrame(
        targetFrame.file,
        targetFrame.lineNumber,
        targetFrame.column ?? 0
      );
    }

    return {
      stack: symbolicatedStack,
      codeFrame,
    };
  }
}
