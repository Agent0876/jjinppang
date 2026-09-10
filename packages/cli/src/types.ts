import type { Platform } from '@react-native-bun-build/bundler-plugin';

export interface CommandOption<T = unknown> {
  name: string;
  description?: string;
  parse?: (val: string) => T;
  default?: string | boolean | number | (() => string | boolean | number);
}

export interface Command<T = any> {
  name: string;
  description?: string;
  func: (
    argv: string[],
    config: CliConfig,
    args: T
  ) => Promise<void> | void;
  options?: CommandOption[];
}


export interface CliProjectConfig {
  root: string;
  reactNativePath?: string;
}

export interface CliConfig {
  root: string;
  reactNativePath?: string;
  project?: {
    ios?: {
      sourceDir?: string;
    };
    android?: {
      sourceDir?: string;
    };
  };
}

export interface BundleArguments {
  entryFile: string;
  platform: Platform;
  dev: boolean;
  minify?: boolean;
  bundleOutput: string;
  bundleEncoding?: BufferEncoding;
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
  assetsDest?: string;
  resetCache?: boolean;
  config?: string;
}

export interface StartArguments {
  port?: number;
  host?: string;
  resetCache?: boolean;
  config?: string;
  projectRoot?: string;
}

