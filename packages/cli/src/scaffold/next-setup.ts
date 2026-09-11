import fs from 'node:fs';
import path from 'node:path';

export interface SetupNextResult {
  configured: boolean;
  webDir: string;
}

/**
 * Configures Next.js universal web app (apps/web) with react-native-web and shared UI components.
 */
export function setupNextjs(
  projectDir: string,
  projectName: string,
  dryRun = false
): SetupNextResult {
  const projectNameLower = projectName.toLowerCase();
  const webDir = path.join(projectDir, 'apps/web');
  const appDir = path.join(webDir, 'app');

  if (dryRun) {
    return { configured: true, webDir };
  }

  fs.mkdirSync(appDir, { recursive: true });

  // 1. apps/web/package.json
  const webPkg = {
    name: 'web',
    version: '0.0.1',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'oxlint',
      check: 'oxlint && oxfmt --check',
    },
    dependencies: {
      [`@${projectNameLower}/ui`]: 'workspace:*',
      next: '^15.1.0',
      react: '19.2.3',
      'react-dom': '19.2.3',
      'react-native-web': '^0.19.13',
    },
    devDependencies: {
      '@types/node': '^22.10.0',
      '@types/react': '^19.2.0',
      '@types/react-dom': '^19.2.0',
      typescript: '^5.7.0',
    },
  };
  fs.writeFileSync(
    path.join(webDir, 'package.json'),
    JSON.stringify(webPkg, null, 2) + '\n',
    'utf8'
  );

  // 2. apps/web/next.config.mjs
  const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@${projectNameLower}/ui', 'react-native-web'],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };
    config.resolve.extensions = [
      '.web.js',
      '.web.jsx',
      '.web.ts',
      '.web.tsx',
      ...(config.resolve.extensions || []),
    ];
    return config;
  },
};

export default nextConfig;
`;
  fs.writeFileSync(path.join(webDir, 'next.config.mjs'), nextConfigContent, 'utf8');

  // 3. apps/web/tsconfig.json
  const tsconfigContent = {
    compilerOptions: {
      target: 'ES2022',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };
  fs.writeFileSync(
    path.join(webDir, 'tsconfig.json'),
    JSON.stringify(tsconfigContent, null, 2) + '\n',
    'utf8'
  );

  // 4. apps/web/app/globals.css
  const globalsCss = `html,
body {
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #09090b;
  color: #ffffff;
}

* {
  box-sizing: border-box;
}
`;
  fs.writeFileSync(path.join(appDir, 'globals.css'), globalsCss, 'utf8');

  // 5. apps/web/app/layout.tsx
  const layoutContent = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${projectName} - Next.js Universal Web',
  description: 'Cross-platform Web app powered by Next.js and Bun',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
  fs.writeFileSync(path.join(appDir, 'layout.tsx'), layoutContent, 'utf8');

  // 6. apps/web/app/page.tsx
  const pageContent = `'use client';

import React from 'react';
import { SharedCard } from '@${projectNameLower}/ui';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#09090b',
        color: '#ffffff',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            display: 'inline-block',
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            color: '#a1a1aa',
            marginBottom: 16,
          }}
        >
          ⚡ Universal Next.js Web App (Bun)
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, margin: '8px 0', letterSpacing: -0.5 }}>
          ${projectName}
        </h1>
        <p style={{ color: '#71717a', fontSize: 16, maxWidth: 500, margin: '8px auto' }}>
          Seamless code sharing across iOS, Android, Desktop, and Next.js Web with react-native-web.
        </p>
      </header>

      <SharedCard
        title="Universal Cross-Platform Component"
        subtitle="This component is written using React Native primitives and rendered natively on Web using react-native-web & Next.js!"
      />
    </main>
  );
}
`;
  fs.writeFileSync(path.join(appDir, 'page.tsx'), pageContent, 'utf8');

  // 7. Update workspace root package.json scripts
  const rootPkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    rootPkg.scripts = rootPkg.scripts || {};
    rootPkg.scripts['web'] = 'bun --filter web dev';
    rootPkg.scripts['build:web'] = 'bun --filter web build';
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n', 'utf8');
  }

  return { configured: true, webDir };
}
