import fs from 'node:fs';

import { isNotNil } from 'es-toolkit';

import { stripFlowSyntax } from '../common/transformer';
import {
  DEFAULT_ASSET_EXTENSIONS,
  DEFAULT_ASSET_REGISTRY_PATH,
  DEFAULT_RESOLVER_CONDITION_NAMES,
  DEFAULT_RESOLVER_MAIN_FIELDS,
  DEFAULT_SOURCE_EXTENSIONS,
} from '../constants';
import { getInitializeCorePath, getPolyfillScriptPaths } from '../internal/react-native';
import { resolvePackagePath } from '../utils/node-resolve';
import { DefineConfigContext } from './define-config';
import type { Config, Polyfill } from './types';

export function getDefaultConfig(
  basePath: string,
  context: Omit<DefineConfigContext, 'defaultConfig'>,
) {
  const reactNativePath = resolvePackagePath(basePath, 'react-native');
  const isDevServer = context.command === 'start';

  const defaultConfig = {
    root: basePath,
    entry: 'index.js',
    resolver: {
      sourceExtensions: DEFAULT_SOURCE_EXTENSIONS,
      assetExtensions: DEFAULT_ASSET_EXTENSIONS,
      mainFields: DEFAULT_RESOLVER_MAIN_FIELDS,
      conditionNames: DEFAULT_RESOLVER_CONDITION_NAMES,
      preferNativePlatform: true,
    },
    transformer: {
      flow: {
        filter: {
          id: /\.jsx?$/,
          code: /@flow/,
        },
      },
    },
    serializer: {
      prelude: [getInitializeCorePath(basePath)],
      polyfills: [
        ...getPolyfillScriptPaths(reactNativePath).map(
          (path) =>
            ({
              type: 'iife',
              code: stripFlowSyntax(fs.readFileSync(path, 'utf-8')),
            }) satisfies Polyfill,
        ),
        isDevServer ? require.resolve('@rollipop/core/hmr-shims') : undefined,
      ].filter(isNotNil),
    },
    watcher: {
      skipWrite: true,
      useDebounce: true,
      debounceDuration: 50,
    },
    reactNative: {
      codegen: {
        filter: {
          code: /codegenNativeComponent/,
        },
      },
      assetRegistryPath: DEFAULT_ASSET_REGISTRY_PATH,
    },
    terminal: {
      status: process.stderr.isTTY ? 'progress' : 'compat',
    },
  } satisfies Config;

  return defaultConfig;
}

export type DefaultConfig = ReturnType<typeof getDefaultConfig>;
export type ResolvedConfig = Config & DefaultConfig;
