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
    expect(pkg.scripts['lint']).toBe('jjinppang lint');
    expect(pkg.scripts['format']).toBe('jjinppang format');
    expect(pkg.scripts['check']).toBe(
      'jjinppang lint && jjinppang format --check && jjinppang test'
    );
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
    expect(fs.existsSync(path.join(projectDir, 'jjinppang.config.js'))).toBe(true);
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

  test('scaffolds project with react-native-webview when webview is enabled', async () => {
    const projectName = 'WebviewApp';
    const projectDir = path.join(TEST_DIR, projectName);

    await generateProjectFromTemplate({
      projectName,
      targetDir: projectDir,
      platforms: ['ios', 'android'],
      pm: 'bun',
      oxc: true,
      webview: true,
    });

    // 1. Check WebViewDemo component
    const webviewComponentPath = path.join(projectDir, 'src/components/WebViewDemo.tsx');
    expect(fs.existsSync(webviewComponentPath)).toBe(true);
    const componentContent = fs.readFileSync(webviewComponentPath, 'utf8');
    expect(componentContent).toContain("from 'react-native-webview'");
    expect(componentContent).toContain('export function WebViewDemo');

    // 2. Check package.json has react-native-webview
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['react-native-webview']).toBeDefined();

    // 3. Check App.tsx renders WebViewDemo
    const appTsx = fs.readFileSync(path.join(projectDir, 'App.tsx'), 'utf8');
    expect(appTsx).toContain("import { WebViewDemo } from './src/components/WebViewDemo'");
    expect(appTsx).toContain('<WebViewDemo />');
  });

  test('scaffolds project with both Redux and WebView combined', async () => {
    const projectName = 'FullStackApp';
    const projectDir = path.join(TEST_DIR, projectName);

    await generateProjectFromTemplate({
      projectName,
      targetDir: projectDir,
      platforms: ['ios', 'android'],
      pm: 'bun',
      oxc: true,
      redux: true,
      webview: true,
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@reduxjs/toolkit']).toBeDefined();
    expect(pkg.dependencies['react-redux']).toBeDefined();
    expect(pkg.dependencies['react-native-webview']).toBeDefined();

    const appTsx = fs.readFileSync(path.join(projectDir, 'App.tsx'), 'utf8');
    expect(appTsx).toContain('<Provider store={store}>');
    expect(appTsx).toContain('<CounterSection />');
    expect(appTsx).toContain('<WebViewDemo />');
  });

  test('scaffolds monorepo workspace structure via initNewProject', async () => {
    const { initNewProject } = await import('../packages/cli/src/scaffold/project-init.js');
    const projectName = 'MonorepoApp';

    const result = await initNewProject(projectName, TEST_DIR, {
      platforms: 'ios,android',
      skipInstall: true,
      skipPods: true,
      monorepo: true,
      webview: true,
      redux: true,
    });

    expect(result.configuredMonorepo).toBe(true);
    expect(result.configuredWebview).toBe(true);
    expect(result.configuredRedux).toBe(true);

    const rootDir = path.join(TEST_DIR, projectName);

    // 1. Root workspace package.json
    const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    expect(rootPkg.workspaces).toEqual(['apps/*', 'packages/*']);
    expect(rootPkg.scripts['start']).toContain('apps/mobile');

    // 2. apps/mobile package.json
    const mobilePkgPath = path.join(rootDir, 'apps/mobile/package.json');
    expect(fs.existsSync(mobilePkgPath)).toBe(true);
    const mobilePkg = JSON.parse(fs.readFileSync(mobilePkgPath, 'utf8'));
    expect(mobilePkg.dependencies['@reduxjs/toolkit']).toBeDefined();
    expect(mobilePkg.dependencies['react-native-webview']).toBeDefined();
    expect(mobilePkg.dependencies[`@${projectName.toLowerCase()}/ui`]).toBe('workspace:*');

    // 3. packages/ui shared package
    const uiPkgPath = path.join(rootDir, 'packages/ui/package.json');
    expect(fs.existsSync(uiPkgPath)).toBe(true);
    const uiPkg = JSON.parse(fs.readFileSync(uiPkgPath, 'utf8'));
    expect(uiPkg.name).toBe(`@${projectName.toLowerCase()}/ui`);
    expect(fs.existsSync(path.join(rootDir, 'packages/ui/src/Card.tsx'))).toBe(true);

    // 4. apps/mobile/App.tsx imports SharedCard
    const mobileAppTsx = fs.readFileSync(path.join(rootDir, 'apps/mobile/App.tsx'), 'utf8');
    expect(mobileAppTsx).toContain(`from '@${projectName.toLowerCase()}/ui'`);
    expect(mobileAppTsx).toContain('<SharedCard');
    expect(mobileAppTsx).toContain('<WebViewDemo />');
    expect(mobileAppTsx).toContain('<CounterSection />');
  });

  test('scaffolds universal Next.js 15 web app (apps/web) via initNewProject with --next', async () => {
    const { initNewProject } = await import('../packages/cli/src/scaffold/project-init.js');
    const projectName = 'NextUniversalApp';

    const result = await initNewProject(projectName, TEST_DIR, {
      platforms: 'ios,android',
      skipInstall: true,
      skipPods: true,
      next: true,
    });

    expect(result.configuredNext).toBe(true);
    expect(result.configuredMonorepo).toBe(true);

    const rootDir = path.join(TEST_DIR, projectName);

    // 1. Root workspace package.json scripts
    const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    expect(rootPkg.workspaces).toEqual(['apps/*', 'packages/*']);
    expect(rootPkg.scripts['web']).toBe('bun --filter web dev');
    expect(rootPkg.scripts['build:web']).toBe('bun --filter web build');

    // 2. apps/web/package.json
    const webPkgPath = path.join(rootDir, 'apps/web/package.json');
    expect(fs.existsSync(webPkgPath)).toBe(true);
    const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));
    expect(webPkg.name).toBe('web');
    expect(webPkg.dependencies['next']).toBeDefined();
    expect(webPkg.dependencies['react-native-web']).toBeDefined();
    expect(webPkg.dependencies[`@${projectName.toLowerCase()}/ui`]).toBe('workspace:*');

    // 3. apps/web/next.config.mjs
    const nextConfigPath = path.join(rootDir, 'apps/web/next.config.mjs');
    expect(fs.existsSync(nextConfigPath)).toBe(true);
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
    expect(nextConfigContent).toContain(
      `transpilePackages: ['@${projectName.toLowerCase()}/ui', 'react-native-web']`
    );
    expect(nextConfigContent).toContain(`'react-native$': 'react-native-web'`);

    // 4. apps/web/app/page.tsx
    const pageTsxPath = path.join(rootDir, 'apps/web/app/page.tsx');
    expect(fs.existsSync(pageTsxPath)).toBe(true);
    const pageTsxContent = fs.readFileSync(pageTsxPath, 'utf8');
    expect(pageTsxContent).toContain(`from '@${projectName.toLowerCase()}/ui'`);
    expect(pageTsxContent).toContain('<SharedCard');

    // 5. apps/web/tsconfig.json
    expect(fs.existsSync(path.join(rootDir, 'apps/web/tsconfig.json'))).toBe(true);
  });
});
