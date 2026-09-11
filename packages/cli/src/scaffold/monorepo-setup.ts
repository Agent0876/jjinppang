import fs from 'node:fs';
import path from 'node:path';

export interface SetupMonorepoResult {
  configured: boolean;
  rootPackageJson: string;
  uiPackageDir: string;
}

/**
 * Configures a Bun workspace monorepo with apps/ and packages/ structure.
 */
export function setupMonorepo(
  projectDir: string,
  projectName: string,
  dryRun = false
): SetupMonorepoResult {
  const projectNameLower = projectName.toLowerCase();
  const rootPkgPath = path.join(projectDir, 'package.json');
  const packagesDir = path.join(projectDir, 'packages');
  const uiPackageDir = path.join(packagesDir, 'ui');
  const uiSrcDir = path.join(uiPackageDir, 'src');

  if (dryRun) {
    return { configured: true, rootPackageJson: rootPkgPath, uiPackageDir };
  }

  // 1. Create packages/ui/ directory
  fs.mkdirSync(uiSrcDir, { recursive: true });

  // 2. packages/ui/package.json
  const uiPkgContent = {
    name: `@${projectNameLower}/ui`,
    version: '0.0.1',
    private: true,
    main: './src/index.ts',
    types: './src/index.ts',
    peerDependencies: {
      react: '*',
      'react-native': '*',
    },
  };
  fs.writeFileSync(
    path.join(uiPackageDir, 'package.json'),
    JSON.stringify(uiPkgContent, null, 2) + '\n',
    'utf8'
  );

  // 3. packages/ui/tsconfig.json
  const uiTsconfig = {
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      declaration: true,
      strict: true,
      skipLibCheck: true,
    },
    include: ['src/**/*'],
  };
  fs.writeFileSync(
    path.join(uiPackageDir, 'tsconfig.json'),
    JSON.stringify(uiTsconfig, null, 2) + '\n',
    'utf8'
  );

  // 4. packages/ui/src/Card.tsx
  const cardContent = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface SharedCardProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function SharedCard({ title, subtitle, children }: SharedCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>📦 Monorepo Workspace</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#3f3f46',
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
  },
});
`;
  fs.writeFileSync(path.join(uiSrcDir, 'Card.tsx'), cardContent, 'utf8');

  // 5. packages/ui/src/index.ts
  const indexContent = `export * from './Card';\n`;
  fs.writeFileSync(path.join(uiSrcDir, 'index.ts'), indexContent, 'utf8');

  // 6. Update root package.json with workspaces if exists
  if (fs.existsSync(rootPkgPath)) {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    if (!rootPkg.workspaces) {
      rootPkg.workspaces = ['apps/*', 'packages/*'];
    }
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n', 'utf8');
  }

  return { configured: true, rootPackageJson: rootPkgPath, uiPackageDir };
}

/**
 * Updates an application's package.json to depend on the shared UI package via workspace:*.
 */
export function linkMonorepoPackage(appDir: string, projectName: string, dryRun = false): void {
  if (dryRun) return;

  const projectNameLower = projectName.toLowerCase();
  const pkgPath = path.join(appDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies[`@${projectNameLower}/ui`] = 'workspace:*';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  // Inject SharedCard into App.tsx if present
  const appPath = path.join(appDir, 'App.tsx');
  if (fs.existsSync(appPath)) {
    let appContent = fs.readFileSync(appPath, 'utf8');
    if (!appContent.includes('SharedCard')) {
      appContent = `import { SharedCard } from '@${projectNameLower}/ui';\n` + appContent;
      if (appContent.includes('</ScrollView>')) {
        appContent = appContent.replace(
          '</ScrollView>',
          `  <SharedCard
          title="Shared Monorepo Component"
          subtitle="Directly imported from packages/ui via Bun workspace:* without build step."
        />\n      </ScrollView>`
        );
      }
      fs.writeFileSync(appPath, appContent, 'utf8');
    }
  }
}
