import type * as rolldown from 'rolldown';
import type { DevWatchOptions, TransformOptions } from 'rolldown/experimental';

export interface Config {
  root?: string;
  entry?: string;
  resolver?: ResolverConfig;
  transformer?: TransformerConfig;
  serializer?: SerializerConfig;
  watcher?: WatcherConfig;
  reactNative?: ReactNativeConfig;
  terminal?: TerminalConfig;
  plugins?: rolldown.Plugin[];
  rolldown?:
    | RolldownConfig
    | ((config: RolldownConfig) => RolldownConfig)
    | ((config: RolldownConfig) => Promise<RolldownConfig>);
}

export type ResolverConfig = Omit<NonNullable<rolldown.InputOptions['resolve']>, 'extensions'> & {
  sourceExtensions?: string[];
  assetExtensions?: string[];
  preferNativePlatform?: boolean;
};

export type TransformerConfig = Omit<TransformOptions, 'plugins'> & {
  flow?: FlowConfig;
};

export interface FlowConfig {
  filter?: rolldown.HookFilter;
}

export interface SerializerConfig {
  prelude?: string[];
  polyfills?: Polyfill[];
}

export type Polyfill = string | PolyfillWithCode | PolyfillWithPath;
export type PolyfillWithCode = { type: PolyfillType; code: string };
export type PolyfillWithPath = { type: PolyfillType; path: string };
export type PolyfillType = 'plain' | 'iife';

export type WatcherConfig = DevWatchOptions;

export interface ReactNativeConfig {
  codegen?: CodegenConfig;
  assetRegistryPath?: string;
}

export interface CodegenConfig {
  filter?: rolldown.HookFilter;
}

export interface TerminalConfig {
  status?: 'compat' | 'progress';
}

export interface RolldownConfig {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}
