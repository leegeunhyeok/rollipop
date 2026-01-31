import fs from 'node:fs';

import { isDebugEnabled } from '../common/debug';
import { generateSourceFromAst, stripFlowSyntax } from '../common/transformer';
import {
  DEFAULT_ASSET_EXTENSIONS,
  DEFAULT_ASSET_REGISTRY_PATH,
  DEFAULT_ENV_PREFIX,
  DEFAULT_REACT_NATIVE_GLOBAL_IDENTIFIERS,
  DEFAULT_RESOLVER_CONDITION_NAMES,
  DEFAULT_RESOLVER_MAIN_FIELDS,
  DEFAULT_SOURCE_EXTENSIONS,
} from '../constants';
import { getInitializeCorePath, getPolyfillScriptPaths } from '../internal/react-native';
import { resolvePackagePath } from '../utils/node-resolve';
import type { PluginFlattenConfig } from './merge-config';
import type { Config, DevModeConfig, OptimizationConfig, Polyfill, TerminalConfig } from './types';

export function getDefaultConfig(projectRoot: string, mode?: Config['mode']) {
  let reactNativePath: string;
  try {
    reactNativePath =
      process.env.ROLLIPOP_REACT_NATIVE_PATH ?? resolvePackagePath(projectRoot, 'react-native');
  } catch {
    throw new Error(
      `Could not resolve 'react-native' package path. Please check your project path.`,
    );
  }

  const defaultConfig = {
    root: projectRoot,
    mode: mode ?? 'development',
    entry: 'index.js',
    resolver: {
      sourceExtensions: DEFAULT_SOURCE_EXTENSIONS,
      assetExtensions: DEFAULT_ASSET_EXTENSIONS,
      mainFields: DEFAULT_RESOLVER_MAIN_FIELDS,
      conditionNames: DEFAULT_RESOLVER_CONDITION_NAMES,
      preferNativePlatform: true,
      symlinks: true,
    },
    transformer: {
      svg: true,
      flow: {
        filter: {
          id: /\.jsx?$/,
          code: /@flow/,
        },
      },
    },
    serializer: {
      prelude: [getInitializeCorePath(projectRoot)],
      polyfills: getPolyfillScriptPaths(reactNativePath).map(
        (path) =>
          ({
            type: 'iife',
            code: generateSourceFromAst(stripFlowSyntax(fs.readFileSync(path, 'utf-8')), path).code,
          }) satisfies Polyfill,
      ),
    },
    watcher: {
      skipWrite: true,
      useDebounce: true,
      debounceDuration: 50,
    },
    optimization: {
      treeshake: true as NonNullable<OptimizationConfig['treeshake']>,
    },
    reactNative: {
      reactNativePath,
      codegen: {
        /**
         * @see {@link https://github.com/facebook/react-native/blob/v0.83.1/packages/react-native-babel-preset/src/configs/main.js#L78}
         */
        filter: {
          code: /\bcodegenNativeComponent</,
        },
      },
      assetRegistryPath: DEFAULT_ASSET_REGISTRY_PATH,
      globalIdentifiers: DEFAULT_REACT_NATIVE_GLOBAL_IDENTIFIERS,
    },
    devMode: {
      hmr: true as NonNullable<DevModeConfig['hmr']>,
    },
    terminal: {
      status: ((): TerminalConfig['status'] => {
        if (isDebugEnabled()) {
          return 'compat';
        }
        if (process.stderr.isTTY) {
          return 'progress';
        }
        return 'compat';
      })(),
    },
    envDir: projectRoot,
    envPrefix: DEFAULT_ENV_PREFIX,
  } satisfies Config;

  return defaultConfig;
}

export type DefaultConfig = ReturnType<typeof getDefaultConfig>;
export type ResolvedConfig = DefaultConfig & PluginFlattenConfig;
