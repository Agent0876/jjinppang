export type Platform = 'ios' | 'android';

export interface AssetFile {
  scale: number;
  path: string;
}

export interface AssetMetadata {
  __packager_asset: boolean;
  httpServerLocation: string;
  width: number;
  height: number;
  scales: number[];
  hash: string;
  name: string;
  type: string;
  files: AssetFile[];
}

export interface HermesOptions {
  enabled?: boolean;
  hermescPath?: string;
  flags?: string[];
}

export interface BabelHybridOptions {
  /**
   * Package names or regex patterns that trigger Babel transform
   * (e.g. ['react-native-reanimated'])
   */
  transformPatterns?: (string | RegExp)[];
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
}

export interface BundlerOptions {
  projectRoot: string;
  entryFile: string;
  platform: Platform;
  dev: boolean;
  minify?: boolean;
  bundleOutput: string;
  bundleEncoding?: BufferEncoding;
  assetsDest?: string;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
  resetCache?: boolean;
  hermes?: HermesOptions;
  assetExtensions?: string[];
  alias?: Record<string, string>;
  babel?: BabelHybridOptions;
}

export interface ReactNativeBunBuildConfig {
  assetExtensions?: string[];
  alias?: Record<string, string>;
  babel?: BabelHybridOptions;
  hermes?: HermesOptions;
  minify?: boolean;
}
