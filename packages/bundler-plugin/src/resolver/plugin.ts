import path from 'node:path';
import type { BunPlugin } from 'bun';
import type { ResolverOptions } from './resolver.js';
import { resolveSpecifier } from './resolver.js';

/**
 * Creates the Bun.build plugin for React Native platform resolution
 */
export function createResolverPlugin(options: ResolverOptions): BunPlugin {
  return {
    name: 'react-native-resolver',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        // Skip Bun internal namespaces or empty paths
        if (args.path.startsWith('\0')) {
          return undefined;
        }

        const importerDir = args.importer ? path.dirname(args.importer) : options.projectRoot;
        const resolved = resolveSpecifier(args.path, importerDir, options);

        if (resolved) {
          return {
            path: resolved,
          };
        }

        return undefined;
      });
    },
  };
}
