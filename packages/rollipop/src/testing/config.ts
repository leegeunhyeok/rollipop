import path from 'node:path';

import { noop } from 'es-toolkit';

import type { Config, ResolvedConfig } from '../config';
import {
  DEFAULT_ASSET_EXTENSIONS,
  DEFAULT_ASSET_REGISTRY_PATH,
  DEFAULT_ENV_PREFIX,
  DEFAULT_RESOLVER_CONDITION_NAMES,
  DEFAULT_RESOLVER_MAIN_FIELDS,
  DEFAULT_SOURCE_EXTENSIONS,
} from '../constants';
import type { Reporter } from '../types';

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
    reactNative: {
      codegen: {
        filter: {
          code: /\bcodegenNativeComponent</,
        },
      },
      assetRegistryPath: DEFAULT_ASSET_REGISTRY_PATH,
    },
    devMode: {
      hmr: true,
    },
    terminal: {
      status: process.stderr.isTTY ? 'progress' : 'compat',
    },
    reporter: { update: noop } as Reporter,
    envDir: basePath,
    envPrefix: DEFAULT_ENV_PREFIX,
  } satisfies Config;

  return defaultConfig;
}
