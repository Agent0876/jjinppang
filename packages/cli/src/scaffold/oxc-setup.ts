import fs from 'node:fs';
import path from 'node:path';

export interface SetupOxcResult {
  configured: boolean;
  oxlintFile: string;
  oxfmtFile: string;
}

/**
 * Configures OXC (oxlint and oxfmt) configuration files in the project
 */
export function setupOxc(projectDir: string, dryRun = false, force = false): SetupOxcResult {
  const oxlintFile = path.join(projectDir, '.oxlintrc.json');
  const oxfmtFile = path.join(projectDir, '.oxfmtrc.json');

  const oxlintConfig = {
    $schema: './node_modules/oxlint/configuration_schema.json',
    plugins: ['typescript', 'unicorn', 'oxc'],
    categories: {
      correctness: 'error',
    },
    rules: {
      'eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
    env: {
      builtin: true,
      node: true,
    },
    ignorePatterns: [
      'dist/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      '.jjinppang-temp/**',
      'bun.lock',
    ],
  };

  const oxfmtConfig = {
    $schema: './node_modules/oxfmt/configuration_schema.json',
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    printWidth: 100,
    bracketSpacing: true,
    arrowParens: 'always',
    ignorePatterns: [
      'dist/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      '.jjinppang-temp/**',
      'bun.lock',
      '*.bundle',
      '*.jsbundle',
      '*.hbc',
      '*.map',
    ],
  };

  if (!dryRun) {
    if (!fs.existsSync(oxlintFile) || force) {
      fs.writeFileSync(oxlintFile, JSON.stringify(oxlintConfig, null, 2) + '\n', 'utf8');
    }
    if (!fs.existsSync(oxfmtFile) || force) {
      fs.writeFileSync(oxfmtFile, JSON.stringify(oxfmtConfig, null, 2) + '\n', 'utf8');
    }

    // Clean up legacy ESLint & Prettier config files to avoid confusion
    const legacyConfigFiles = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      '.prettierrc.js',
      '.prettierrc.cjs',
      '.prettierrc.json',
      '.prettierrc.yml',
      '.prettierrc.yaml',
      '.prettierrc',
    ];
    for (const file of legacyConfigFiles) {
      const fullPath = path.join(projectDir, file);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { force: true });
      }
    }
  }

  return { configured: true, oxlintFile, oxfmtFile };
}
