import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateProjectFromTemplate,
  resolveTemplatePath,
} from '../packages/cli/src/scaffold/template-generator.js';

const TEST_DIR = path.join(__dirname, '.temp-template-test');

describe('Template Generator (Built-in Scaffolder)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('resolves built-in default template path correctly', () => {
    const templatePath = resolveTemplatePath('default');
    expect(fs.existsSync(templatePath)).toBe(true);
    expect(fs.existsSync(path.join(templatePath, 'package.json'))).toBe(true);
  });

  test('scaffolds a clean React Native project without ESLint or Prettier', async () => {
    const projectName = 'SuperBunApp';
    const projectDir = path.join(TEST_DIR, projectName);

    await generateProjectFromTemplate({
      projectName,
      targetDir: projectDir,
      platforms: ['ios', 'android', 'macos'],
      pm: 'bun',
      oxc: true,
    });

    // 1. Check directory was created
    expect(fs.existsSync(projectDir)).toBe(true);

    // 2. Check package.json
    const pkgPath = path.join(projectDir, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.name).toBe(projectName);
    expect(pkg.devDependencies['eslint']).toBeUndefined();
    expect(pkg.devDependencies['prettier']).toBeUndefined();
    expect(pkg.devDependencies['@react-native/eslint-config']).toBeUndefined();
    expect(pkg.devDependencies['oxlint']).toBeDefined();
    expect(pkg.devDependencies['oxfmt']).toBeDefined();
    expect(pkg.scripts['lint']).toBe('bun-rn lint');
    expect(pkg.scripts['format']).toBe('bun-rn format');
    expect(pkg.scripts['check']).toBe('bun-rn lint && bun-rn format --check && bun-rn test');
    expect(pkg.devDependencies['react-native-macos']).toBeDefined();

    // 3. Check config files (OXC present, ESLint/Prettier absent)
    expect(fs.existsSync(path.join(projectDir, '.oxlintrc.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.oxfmtrc.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.eslintrc.js'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '.prettierrc.js'))).toBe(false);

    // 4. Check dotfile renamings
    expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.watchmanconfig'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '_gitignore'))).toBe(false);

    // 5. Check iOS project renaming
    expect(fs.existsSync(path.join(projectDir, `ios/${projectName}.xcodeproj`))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, `ios/${projectName}/AppDelegate.swift`))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'ios/HelloWorld.xcodeproj'))).toBe(false);

    const podfileContent = fs.readFileSync(path.join(projectDir, 'ios/Podfile'), 'utf8');
    expect(podfileContent).toContain(`target '${projectName}'`);

    // 6. Check Android package renaming and folder restructuring
    const androidPkgDir = path.join(
      projectDir,
      `android/app/src/main/java/com/${projectName.toLowerCase()}`
    );
    expect(fs.existsSync(androidPkgDir)).toBe(true);
    expect(fs.existsSync(path.join(androidPkgDir, 'MainActivity.kt'))).toBe(true);
    expect(fs.existsSync(path.join(androidPkgDir, 'MainApplication.kt'))).toBe(true);

    const mainActivityContent = fs.readFileSync(
      path.join(androidPkgDir, 'MainActivity.kt'),
      'utf8'
    );
    expect(mainActivityContent).toContain(`package com.${projectName.toLowerCase()}`);
    expect(mainActivityContent).toContain(`"${projectName}"`);

    // 7. Check App.tsx, index.js, and app.json
    const appTsxContent = fs.readFileSync(path.join(projectDir, 'App.tsx'), 'utf8');
    expect(appTsxContent).toContain(projectName);

    const appJsonContent = fs.readFileSync(path.join(projectDir, 'app.json'), 'utf8');
    expect(appJsonContent).toContain(`"name": "${projectName}"`);

    const indexJsContent = fs.readFileSync(path.join(projectDir, 'index.js'), 'utf8');
    expect(indexJsContent).toContain('AppRegistry.registerComponent');

    // 8. Check react-native configs
    expect(fs.existsSync(path.join(projectDir, 'react-native-bun-build.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'react-native.config.js'))).toBe(true);
  });

  test('scaffolds project with Redux Toolkit when redux is enabled', async () => {
    const projectName = 'ReduxApp';
    const projectDir = path.join(TEST_DIR, projectName);

    await generateProjectFromTemplate({
      projectName,
      targetDir: projectDir,
      platforms: ['ios', 'android'],
      pm: 'bun',
      oxc: true,
      redux: true,
    });

    // 1. Check store files
    const storeDir = path.join(projectDir, 'src/store');
    expect(fs.existsSync(storeDir)).toBe(true);
    expect(fs.existsSync(path.join(storeDir, 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(storeDir, 'hooks.ts'))).toBe(true);
    expect(fs.existsSync(path.join(storeDir, 'counterSlice.ts'))).toBe(true);

    // 2. Check dependencies in package.json
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@reduxjs/toolkit']).toBeDefined();
    expect(pkg.dependencies['react-redux']).toBeDefined();

    // 3. Check App.tsx uses Provider and Redux hooks
    const appTsx = fs.readFileSync(path.join(projectDir, 'App.tsx'), 'utf8');
    expect(appTsx).toContain("import { Provider } from 'react-redux'");
    expect(appTsx).toContain('<Provider store={store}>');
    expect(appTsx).toContain('useAppSelector');
    expect(appTsx).toContain('useAppDispatch');
    expect(appTsx).toContain(projectName);
  });
});
