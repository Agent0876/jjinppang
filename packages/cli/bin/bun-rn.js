#!/usr/bin/env bun
import { runCli } from '../src/bin.js';

runCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
