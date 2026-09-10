import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { PackageManagerType } from './pm-detector.js';

/**
 * Runs package manager install command
 */
export function runInstall(projectDir: string, pm: PackageManagerType): boolean {
  console.log(`\n📦 Installing dependencies using ${pm}...`);
  const installCmd = 'install';
  const res = spawnSync(pm, [installCmd], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
  });
  return res.status === 0;
}

/**
 * Runs CocoaPods pod install in ios/ directory if Podfile is present
 */
export function runPodInstall(projectDir: string): boolean {
  const iosDir = path.join(projectDir, 'ios');
  if (!fs.existsSync(path.join(iosDir, 'Podfile'))) {
    return true;
  }

  console.log(`\n🍎 Running CocoaPods (pod install) in ios/...`);
  const res = spawnSync('pod', ['install'], {
    cwd: iosDir,
    stdio: 'inherit',
    shell: true,
  });
  return res.status === 0;
}
