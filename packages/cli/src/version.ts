import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Dynamically resolves the CLI version from package.json
 */
export function getCliVersion(): string {
  try {
    const searchDirs: string[] = [];

    if (process.argv[1]) {
      searchDirs.push(path.dirname(path.resolve(process.argv[1])));
    }

    try {
      searchDirs.push(path.dirname(fileURLToPath(import.meta.url)));
    } catch {
      // ignore
    }

    if (typeof __dirname !== 'undefined') {
      searchDirs.push(__dirname);
    }

    for (const startDir of searchDirs) {
      let curr = startDir;
      for (let i = 0; i < 5; i++) {
        const pkgPath = path.join(curr, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (
              pkg.name === 'jjinppang' ||
              pkg.name === '@jjinppang/cli' ||
              pkg.name === 'react-native-bun-build' ||
              pkg.name === '@react-native-bun-build/cli'
            ) {
              if (pkg.version) return pkg.version;
            }
          } catch {
            // ignore
          }
        }
        const parent = path.dirname(curr);
        if (parent === curr) break;
        curr = parent;
      }
    }
  } catch {
    // fallback
  }

  return '0.1.0';
}
