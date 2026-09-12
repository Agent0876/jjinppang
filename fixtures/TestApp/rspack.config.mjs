import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as Repack from '@callstack/repack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const assetUtilsEntry = path.join(
  path.dirname(require.resolve('@react-native/asset-utils/package.json')),
  'src/index.js'
);

export default Repack.defineRspackConfig({
  context: __dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions(),
    alias: {
      '@react-native/asset-utils$': assetUtilsEntry,
      '@react-native/asset-utils': assetUtilsEntry,
      // Force pre-compiled JS instead of raw TypeScript via "react-native" field
      'react-native-reanimated$': path.resolve(
        __dirname,
        'node_modules/react-native-reanimated/lib/module/index.js'
      ),
      'react-native-worklets$': path.resolve(
        __dirname,
        'node_modules/react-native-worklets/lib/module/index.js'
      ),
    },
    modules: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      'node_modules',
    ],
  },
  module: {
    rules: [
      {
        test: /\.[cm]?[jt]sx?$/,
        type: 'javascript/auto',
        use: {
          loader: '@callstack/repack/babel-swc-loader',
          parallel: true,
          options: {},
        },
      },
      ...Repack.getAssetTransformRules(),
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    new ReanimatedPlugin({ unstable_disableTransform: true }),
  ],
});
