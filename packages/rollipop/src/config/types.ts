import type * as babel from '@babel/core';
import type * as rolldown from '@rollipop/rolldown';
import type { TopLevelFilterExpression } from '@rollipop/rolldown-pluginutils';
import type { DevWatchOptions, TransformOptions } from '@rollipop/rolldown/experimental';
import type * as swc from '@swc/core';

import type { Plugin } from '../core/plugins/types';
import { InteractiveCommand } from '../node/cli-utils';
import type { MaybePromise, NullValue, Reporter } from '../types';

export interface Config {
  /**
   * Defaults to current working directory.
   */
  root?: string;
  /**
   * Specifying this in config will override the default mode for both serve and build.
   *
   * Defaults to: `'development'` for serve, 'production' for build.
   */
  mode?: 'development' | 'production';
  /**
   * Defaults to: `index.js`
   */
  entry?: string;
  /**
   * Resolver configuration.
   */
  resolver?: ResolverConfig;
  /**
   * Transformer configuration.
   */
  transformer?: TransformerConfig;
  /**
   * Serializer configuration.
   */
  serializer?: SerializerConfig;
  /**
   * Watcher configuration.
   */
  watcher?: WatcherConfig;
  /**
   * React Native specific configuration.
   */
  reactNative?: ReactNativeConfig;
  /**
   * Dev mode specific configuration. (for dev server)
   */
  devMode?: DevModeConfig;
  /**
   * Terminal configuration.
   */
  terminal?: TerminalConfig;
  /**
   * Reporter configuration.
   */
  reporter?: Reporter;
  /**
   * Plugins.
   */
  plugins?: PluginOption;
  /**
   * Directory to load environment variables from.
   *
   * Defaults to: `root`
   */
  envDir?: string;
  /**
   * Environment variable prefix.
   *
   * Defaults to: `'ROLLIPOP_'`
   */
  envPrefix?: string;
  /**
   * Rollipop provides default options for Rolldown, but you can override them by this option.
   *
   * **DANGEROUS**: This option is dangerous because it can break the build.
   */
  dangerously_overrideRolldownOptions?:
    | RolldownConfig
    | ((config: RolldownConfig) => RolldownConfig)
    | ((config: RolldownConfig) => Promise<RolldownConfig>);
}

export type PluginOption = MaybePromise<
  | NullValue<Plugin>
  | {
      name: string;
    }
  | false
  | PluginOption[]
>;

export type ResolverConfig = Omit<NonNullable<rolldown.InputOptions['resolve']>, 'extensions'> & {
  /**
   * Defaults to: `['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json']`
   */
  sourceExtensions?: string[];
  /**
   * Defaults to: `['bmp', 'gif', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'ico', 'icns', 'icxl']`
   */
  assetExtensions?: string[];
  /**
   * If `true`, resolver will resolve `native` suffixed files.
   *
   * e.g.
   * - **true**: `index.android` -> `index.native` -> `index`
   * - **false**: `index.android` -> `index`
   *
   * Defaults to: `true`
   */
  preferNativePlatform?: boolean;
};

export type TransformerConfig = Omit<
  TransformOptions,
  'cwd' | 'lang' | 'sourceType' | 'plugins'
> & {
  /**
   * Transform SVG assets files to React components using `@svgr/core`.
   *
   * Defaults to: `true`
   */
  svg?: boolean;
  /**
   * Flow specific configuration.
   */
  flow?: FlowConfig;
  /**
   * Babel transformation configuration.
   */
  babel?: {
    rules?: BabelTransformRule[];
  };
  /**
   * SWC transformation configuration.
   */
  swc?: {
    rules?: SwcTransformRule[];
  };
};

export type BabelTransformRule = TransformRule<babel.TransformOptions>;
export type SwcTransformRule = TransformRule<swc.Options>;

export interface TransformRule<T = unknown> {
  filter?: rolldown.HookFilter | TopLevelFilterExpression[];
  options: T | ((code: string, id: string) => T);
}

export interface FlowConfig {
  /**
   * Filter for Flow transformation pipeline.
   */
  filter?: rolldown.HookFilter | TopLevelFilterExpression[];
}

export interface SerializerConfig {
  /**
   * Paths to prelude files.
   *
   * Prelude files are imported in the top of the entry module.
   */
  prelude?: string[];
  /**
   * Polyfills to include in the output bundle.
   *
   * Polyfills are injected in the top of the output bundle.
   */
  polyfills?: Polyfill[];
}

export type Polyfill = string | PolyfillWithCode | PolyfillWithPath;
export type PolyfillWithCode = { type: PolyfillType; code: string };
export type PolyfillWithPath = { type: PolyfillType; path: string };
export type PolyfillType = 'plain' | 'iife';

export type WatcherConfig = DevWatchOptions;

export interface DevModeConfig {
  /**
   * Hot Module Replacement configurations.
   * This feature is only available in `development` mode.
   *
   * Defaults to `true`.
   */
  hmr?: boolean | HmrConfig;
}

export interface HmrConfig {
  /**
   * Source code of the HMR runtime implementation.
   *
   * Defaults to: using `rollipop/hmr-runtime` as a default implementation.
   */
  runtimeImplement?: string;
  /**
   * Source code of the HMR client implementation.
   *
   * Defaults to: using `rollipop/hmr-client` as a default implementation.
   */
  clientImplement?: string;
}

export interface ReactNativeConfig {
  /**
   * Path to React Native package.
   *
   * Defaults to: resolving `react-native` package from `projectRoot`.
   */
  reactNativePath?: string;
  /**
   * Codegen specific configuration.
   */
  codegen?: CodegenConfig;
  /**
   * Path to asset registry file.
   *
   * Defaults to: `react-native/Libraries/Image/AssetRegistry.js`
   */
  assetRegistryPath?: string;
  /**
   * Reserved global identifiers of React Native.
   *
   * Defaults to: Global identifier list of React Native 0.83
   */
  globalIdentifiers?: string[];
}

export interface CodegenConfig {
  /**
   * Filter for codegen transformation pipeline.
   */
  filter?: rolldown.HookFilter | TopLevelFilterExpression[];
}

export interface TerminalConfig {
  /**
   * Status of the terminal.
   *
   * Defaults to: `process.stderr.isTTY ? 'progress' : 'compat'`
   */
  status?: 'none' | 'compat' | 'progress';
  /**
   * Extra commands to display in the interactive mode.
   */
  extraCommands?: InteractiveCommand[];
}

export interface RolldownConfig {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}
