#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist/bin.js');
const srcPath = path.resolve(__dirname, '../src/bin.ts');
const target = fs.existsSync(distPath) ? distPath : srcPath;

const mod = await import(pathToFileURL(target).href);
if (typeof mod.runCli === 'function') {
  await mod.runCli();
}
