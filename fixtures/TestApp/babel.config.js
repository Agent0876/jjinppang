module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
  overrides: [
    {
      test: /[\\/]node_modules[\\/]/,
      plugins: [],
    },
  ],
};
