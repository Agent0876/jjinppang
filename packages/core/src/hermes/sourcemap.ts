import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Compose packager sourcemap and hermes bytecode sourcemap
 */
export function composeSourceMaps(
  projectRoot: string,
  packagerMap: string,
  hermesMap: string,
  outputMap: string
): void {
  const composeScriptCandidates = [
    path.join(projectRoot, 'node_modules/react-native/scripts/compose-source-maps.js'),
    path.join(
      projectRoot,
      'node_modules/@react-native/community-cli-plugin/dist/commands/bundle/composeSourceMaps.js'
    ),
  ];

  for (const script of composeScriptCandidates) {
    if (fs.existsSync(script)) {
      try {
        const res = spawnSync(process.execPath, [script, packagerMap, hermesMap, '-o', outputMap], {
          stdio: 'pipe',
        });
        if (res.status === 0) {
          return;
        }
      } catch {
        // continue to fallback
      }
    }
  }

  // If compose script not found or failed, keep the Hermes map or packager map
  try {
    if (fs.existsSync(hermesMap)) {
      fs.copyFileSync(hermesMap, outputMap);
    }
  } catch {
    // ignore
  }
}
