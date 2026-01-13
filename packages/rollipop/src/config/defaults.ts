import fs from 'node:fs';

import { isDebugEnabled } from '../common/debug';
import { Logger } from '../common/logger';
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
import type { ReportableEvent, Reporter } from '../types';
import { resolvePackagePath } from '../utils/node-resolve';
import type { PluginFlattenConfig } from './merge-config';
import type { Config, Polyfill, TerminalConfig } from './types';

export function getDefaultConfig(basePath: string, mode?: Config['mode']) {
  let reactNativePath: string;
  try {
    reactNativePath = resolvePackagePath(basePath, 'react-native');
  } catch {
    throw new Error(
      `Could not resolve 'react-native' package path. Please check your project path.`,
    );
  }

  const defaultConfig = {
    root: basePath,
    mode,
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
      prelude: [getInitializeCorePath(basePath)],
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
    reactNative: {
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
      hmr: true,
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
    reporter: new TerminalReporter() as Reporter,
    envDir: basePath,
    envPrefix: DEFAULT_ENV_PREFIX,
  } satisfies Config;

  return defaultConfig;
}

export class TerminalReporter implements Reporter {
  private logger = new Logger('app');

  update(event: ReportableEvent): void {
    if (event.type === 'client_log') {
      if (event.level === 'group' || event.level === 'groupCollapsed') {
        this.logger.info(...event.data);
        return;
      } else if (event.level === 'groupEnd') {
        return;
      }
      this.logger[event.level](...event.data);
    }
  }
}

export type DefaultConfig = ReturnType<typeof getDefaultConfig>;
export type ResolvedConfig = DefaultConfig & PluginFlattenConfig;
