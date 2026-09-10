import type { Command } from '../types.js';
import { bundleCommand } from './bundle.js';
import { bundleCommandOptions } from './options.js';

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
];

export default commands;
export { bundleCommand, bundleCommandOptions };
