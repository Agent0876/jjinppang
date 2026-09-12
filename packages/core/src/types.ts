export type Platform = 'ios' | 'android' | 'macos' | 'windows';

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
  copyJsBundle?: boolean | string;
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

export interface JjinppangConfig {
  assetExtensions?: string[];
  alias?: Record<string, string>;
  babel?: BabelHybridOptions;
  hermes?: HermesOptions;
  minify?: boolean;
}

export interface DevServerOptions {
  projectRoot: string;
  port?: number;
  host?: string;
  resetCache?: boolean;
  assetExtensions?: string[];
  alias?: Record<string, string>;
  babel?: BabelHybridOptions;
  hermes?: HermesOptions;
}

export interface StackFrame {
  file: string | null;
  lineNumber: number | null;
  column: number | null;
  methodName: string;
  collapse?: boolean;
}

export interface CodeFrame {
  content: string;
  location: {
    row: number;
    column: number;
  } | null;
  fileName: string;
}

export interface SymbolicateRequest {
  stack: StackFrame[];
  extraData?: unknown;
}

export interface SymbolicateResponse {
  stack: StackFrame[];
  codeFrame: CodeFrame | null;
}

export interface HMRModule {
  module: [number | string, string];
  sourceURL?: string;
  sourceMappingURL?: string;
}

export interface HMRUpdate {
  isInitialUpdate: boolean;
  revisionId: string;
  added: HMRModule[];
  modified: HMRModule[];
  deleted: (number | string)[];
}

export type HMRMessage =
  | { type: 'heartbeat' }
  | { type: 'bundle-registered' }
  | { type: 'update-start'; body: { isInitialUpdate: boolean } }
  | { type: 'update'; body: HMRUpdate }
  | { type: 'update-done'; body?: { changeId?: string } }
  | { type: 'error'; body: { type: string; message: string; [key: string]: unknown } };
