import type { TopLevelFilterExpression } from '@rolldown/pluginutils';
import type * as rolldown from 'rolldown';
import type { DevWatchOptions, TransformOptions } from 'rolldown/experimental';

import type { Plugin } from '../core/plugins/types';
import type { Reporter } from '../types';

export interface Config {
  /**
   * Defaults to current working directory.
   */
  root?: string;
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
  plugins?: Plugin[];
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
};

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

export interface ReactNativeConfig {
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
  status?: 'compat' | 'progress';
}

export interface RolldownConfig {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}
