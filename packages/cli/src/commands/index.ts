import type { Command } from '../types.js';
import { bundleCommand } from './bundle.js';
import { startCommand } from './start.js';
import { initCommand } from './init.js';
import { lintCommand } from './lint.js';
import { formatCommand } from './format.js';
import {
  bundleCommandOptions,
  startCommandOptions,
  initCommandOptions,
  lintCommandOptions,
  formatCommandOptions,
} from './options.js';

export const commands: Command[] = [
  {
    name: 'bundle',
    description: 'Build the bundle for the provided JavaScript entry file using Bun.',
    func: bundleCommand,
    options: bundleCommandOptions,
  },
  {
    name: 'bun-bundle',
    description: 'Build the bundle for the provided JavaScript entry file using Bun.',
    func: bundleCommand,
    options: bundleCommandOptions,
  },
  {
    name: 'start',
    description: 'Starts the React Native development server powered by Bun.',
    func: startCommand,
    options: startCommandOptions,
  },
  {
    name: 'bun-start',
    description: 'Starts the React Native development server powered by Bun.',
    func: startCommand,
    options: startCommandOptions,
  },
  {
    name: 'init [projectName]',
    description: 'Initialize a new React Native project with Bun or configure an existing project.',
    func: initCommand,
    options: initCommandOptions,
  },
  {
    name: 'bun-init [projectName]',
    description: 'Initialize a new React Native project with Bun or configure an existing project.',
    func: initCommand,
    options: initCommandOptions,
  },
  {
    name: 'lint',
    description: 'Ultra-fast linter powered by OXC (oxlint) for React Native.',
    func: lintCommand,
    options: lintCommandOptions,
  },
  {
    name: 'bun-lint',
    description: 'Ultra-fast linter powered by OXC (oxlint) for React Native.',
    func: lintCommand,
    options: lintCommandOptions,
  },
  {
    name: 'format',
    description: 'Ultra-fast code formatter powered by OXC (oxfmt) for React Native.',
    func: formatCommand,
    options: formatCommandOptions,
  },
  {
    name: 'bun-format',
    description: 'Ultra-fast code formatter powered by OXC (oxfmt) for React Native.',
    func: formatCommand,
    options: formatCommandOptions,
  },
];

export default commands;
export {
  bundleCommand,
  bundleCommandOptions,
  startCommand,
  startCommandOptions,
  initCommand,
  initCommandOptions,
  lintCommand,
  lintCommandOptions,
  formatCommand,
  formatCommandOptions,
};
