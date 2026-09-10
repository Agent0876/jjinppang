import fs from 'node:fs';
import path from 'node:path';

export interface PatchRnConfigResult {
  status: 'created' | 'patched' | 'already_configured';
  file: string;
}

/**
 * Patches or creates react-native.config.js to register react-native-bun-build commands
 */
export function patchReactNativeConfig(projectDir: string, dryRun = false): PatchRnConfigResult {
  const possibleFiles = [
    'react-native.config.js',
    'react-native.config.cjs',
    'react-native.config.mjs',
  ];

  let targetFile = possibleFiles.map((f) => path.join(projectDir, f)).find((f) => fs.existsSync(f));

  if (!targetFile) {
    targetFile = path.join(projectDir, 'react-native.config.js');
    const content = `module.exports = {
  commands: require('react-native-bun-build/commands'),
};
`;
    if (!dryRun) {
      fs.writeFileSync(targetFile, content, 'utf8');
    }
    return { status: 'created', file: targetFile };
  }

  const existingContent = fs.readFileSync(targetFile, 'utf8');
  if (existingContent.includes('react-native-bun-build')) {
    return { status: 'already_configured', file: targetFile };
  }

  let patchedContent: string;
  if (existingContent.includes('commands:')) {
    patchedContent = existingContent.replace(
      /commands:\s*\[/,
      `commands: [\n    ...require('react-native-bun-build/commands'),`
    );
    if (patchedContent === existingContent) {
      patchedContent = existingContent.replace(
        /commands:\s*([^,\n}]+)/,
        `commands: [...require('react-native-bun-build/commands'), ...($1 || [])]`
      );
    }
  } else if (existingContent.includes('module.exports = {')) {
    patchedContent = existingContent.replace(
      'module.exports = {',
      `module.exports = {\n  commands: require('react-native-bun-build/commands'),`
    );
  } else if (existingContent.includes('export default {')) {
    patchedContent = existingContent.replace(
      'export default {',
      `// @ts-ignore\nimport bunCommands from 'react-native-bun-build/commands';\n\nexport default {\n  commands: bunCommands,`
    );
  } else {
    patchedContent = `${existingContent}\n\nmodule.exports.commands = require('react-native-bun-build/commands');\n`;
  }

  if (!dryRun) {
    fs.writeFileSync(targetFile, patchedContent, 'utf8');
  }

  return { status: 'patched', file: targetFile };
}
