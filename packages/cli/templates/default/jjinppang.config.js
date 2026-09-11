/**
 * 🥟 jjinppang Configuration
 * https://github.com/shinseungmin/jjinppang
 */
module.exports = {
  // Custom asset extensions to process
  assetExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf'],

  // Custom module aliases
  alias: {
    // '@components': './src/components',
  },

  // Hybrid Babel configuration
  babel: {
    // Patterns that require Babel AST transform (worklets, macros, etc.)
    transformPatterns: [
      // e.g. /react-native-reanimated/
    ],
    include: [],
    exclude: [],
  },

  // Hermes bytecode compilation settings
  hermes: {
    enabled: true, // Default: true in release builds (--dev false)
    flags: ['-O'],
  },

  // Override minification
  minify: undefined,
};
