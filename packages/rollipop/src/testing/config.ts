import path from 'node:path';

import type { Config, ResolvedConfig } from '../config';
import {
  DEFAULT_ASSET_EXTENSIONS,
  DEFAULT_ASSET_REGISTRY_PATH,
  DEFAULT_ENV_PREFIX,
  DEFAULT_REACT_NATIVE_GLOBAL_IDENTIFIERS,
  DEFAULT_RESOLVER_CONDITION_NAMES,
  DEFAULT_RESOLVER_MAIN_FIELDS,
  DEFAULT_SOURCE_EXTENSIONS,
} from '../constants';

export function createTestConfig(basePath: string): ResolvedConfig {
  const defaultConfig = {
    root: basePath,
    mode: 'development',
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
      prelude: [path.join(basePath, '__tests__/react-native/Libraries/Core/InitializeCore.js')],
      polyfills: [
        {
          type: 'iife',
          code: 'console.log("[TEST] Polyfill")',
        },
      ],
    },
    watcher: {
      skipWrite: true,
      useDebounce: true,
      debounceDuration: 50,
    },
    optimization: {
      treeshake: true,
    },
    reactNative: {
      reactNativePath: '__tests__/react-native',
      codegen: {
        filter: {
          code: /\bcodegenNativeComponent</,
        },
      },
      assetRegistryPath: DEFAULT_ASSET_REGISTRY_PATH,
      globalIdentifiers: DEFAULT_REACT_NATIVE_GLOBAL_IDENTIFIERS,
    },
    devMode: {
      hmr: true,
    },
    terminal: {
      status: process.stderr.isTTY ? 'progress' : 'compat',
    },
    envDir: basePath,
    envPrefix: DEFAULT_ENV_PREFIX,
  } satisfies Config;

  return defaultConfig;
}
