import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TargetPlatform } from '../types.js';
import { type PackageManagerType } from './pm-detector.js';
import { updatePackageJson } from './pkg-updater.js';
import { setupOxc } from './oxc-setup.js';
import { setupRedux } from './redux-setup.js';
import { setupWebview } from './webview-setup.js';
import { patchReactNativeConfig } from './rn-config-patcher.js';
import { generateJjinppangConfig } from './bun-config-gen.js';

export interface GenerateProjectOptions {
  projectName: string;
  targetDir: string;
  platforms: TargetPlatform[];
  pm?: PackageManagerType;
  templateName?: string;
  dryRun?: boolean;
  force?: boolean;
  oxc?: boolean;
  redux?: boolean;
  webview?: boolean;
  monorepo?: boolean;
  rnVersion?: string;
}

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.jar',
  '.keystore',
  '.so',
  '.dylib',
  '.a',
  '.zip',
  '.gz',
  '.tar',
  '.tgz',
  '.wasm',
]);

const DOTFILE_NAMES: Record<string, string> = {
  _gitignore: '.gitignore',
  _watchmanconfig: '.watchmanconfig',
  '_xcode.env': '.xcode.env',
  _bundle: '.bundle',
};

/**
 * Resolves the location of built-in templates
 */
export function resolveTemplatePath(templateName = 'default'): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  const candidates = [
    // Running from src/scaffold/ or dist/scaffold/
    path.resolve(currentDir, '../../templates', templateName),
    path.resolve(currentDir, '../../../templates', templateName),
    path.resolve(process.cwd(), 'packages/cli/templates', templateName),
    path.resolve(process.cwd(), 'templates', templateName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Built-in template "${templateName}" not found. Searched paths:\n${candidates.join('\n')}`
  );
}

function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Recursively copies a directory while replacing placeholder tokens in file contents and file paths.
 */
export async function copyTemplateRecursive(
  sourceDir: string,
  destDir: string,
  projectName: string,
  dryRun = false
): Promise<void> {
  const projectNameLower = projectName.toLowerCase();
  const placeholderName = 'HelloWorld';
  const placeholderLower = 'helloworld';

  if (!dryRun) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(sourceDir, entry.name);

    // 1. Compute target file/dir name
    let targetName = entry.name;

    // Handle dotfile renaming (_gitignore -> .gitignore)
    if (DOTFILE_NAMES[targetName]) {
      targetName = DOTFILE_NAMES[targetName];
    }

    // Replace HelloWorld in name
    if (targetName.includes(placeholderName)) {
      targetName = targetName.replace(new RegExp(placeholderName, 'g'), projectName);
    }

    const dstPath = path.join(destDir, targetName);

    if (entry.isDirectory()) {
      await copyTemplateRecursive(srcPath, dstPath, projectName, dryRun);
    } else {
      if (dryRun) continue;

      if (isBinaryFile(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
      } else {
        const rawContent = fs.readFileSync(srcPath, 'utf8');
        const replacedContent = rawContent
          .replace(new RegExp('Hello App Display Name', 'g'), projectName)
          .replace(new RegExp(placeholderName, 'g'), projectName)
          .replace(new RegExp(placeholderLower, 'g'), projectNameLower);

        fs.writeFileSync(dstPath, replacedContent, 'utf8');
      }
    }
  }
}

/**
 * Ensures the Android java package folder matches the lowercase project name.
 * e.g. android/app/src/main/java/com/helloworld -> android/app/src/main/java/com/<projectname>
 */
export function fixAndroidPackageDirectory(targetDir: string, projectName: string): void {
  const projectNameLower = projectName.toLowerCase();
  if (projectNameLower === 'helloworld') return;

  const comDir = path.join(targetDir, 'android/app/src/main/java/com');
  const oldPkgDir = path.join(comDir, 'helloworld');
  const newPkgDir = path.join(comDir, projectNameLower);

  if (fs.existsSync(oldPkgDir)) {
    if (fs.existsSync(newPkgDir)) {
      fs.rmSync(newPkgDir, { recursive: true, force: true });
    }
    fs.renameSync(oldPkgDir, newPkgDir);
  }
}

/**
 * High-performance, direct template generator for jjinppang.
 * Bypasses heavy @react-native-community/cli init and guarantees a clean, ESLint/Prettier-free environment.
 */
export async function generateProjectFromTemplate(options: GenerateProjectOptions): Promise<void> {
  const { projectName, targetDir, platforms, dryRun = false, force = false, oxc = true } = options;

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0 && !force) {
    throw new Error(
      `Directory ${targetDir} already exists and is not empty. Use --force to overwrite.`
    );
  }

  const templatePath = resolveTemplatePath(options.templateName || 'default');

  // 1. Copy & interpolate template
  await copyTemplateRecursive(templatePath, targetDir, projectName, dryRun);

  if (dryRun) return;

  // 2. Adjust Android package folder
  fixAndroidPackageDirectory(targetDir, projectName);

  // 3. Setup OXC tooling if enabled
  if (oxc) {
    setupOxc(targetDir, dryRun, force);
  }

  // 4. Configure react-native.config.js and jjinppang.config.js
  patchReactNativeConfig(targetDir, dryRun);
  const pkgPath = path.join(targetDir, 'package.json');
  const pkgJson = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {};
  generateJjinppangConfig(targetDir, pkgJson, dryRun, force);

  // 5. Update package.json scripts and platform dependencies
  updatePackageJson(targetDir, {
    oxc,
    platforms,
    rnVersion: options.rnVersion,
    dryRun,
  });

  // 6. Setup Redux Toolkit if enabled
  if (options.redux) {
    await setupRedux(targetDir, projectName, dryRun);
  }

  // 7. Setup React Native WebView if enabled
  if (options.webview) {
    await setupWebview(targetDir, projectName, dryRun, Boolean(options.redux));
  }
}
