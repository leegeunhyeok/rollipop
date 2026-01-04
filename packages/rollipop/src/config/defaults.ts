import fs from 'node:fs';

import { Logger } from '../common/logger';
import { generateSourceFromAst, stripFlowSyntax } from '../common/transformer';
import {
  DEFAULT_ASSET_EXTENSIONS,
  DEFAULT_ASSET_REGISTRY_PATH,
  DEFAULT_RESOLVER_CONDITION_NAMES,
  DEFAULT_RESOLVER_MAIN_FIELDS,
  DEFAULT_SOURCE_EXTENSIONS,
} from '../constants';
import { getInitializeCorePath, getPolyfillScriptPaths } from '../internal/react-native';
import type { ReportableEvent, Reporter } from '../types';
import { resolvePackagePath } from '../utils/node-resolve';
import type { Config, Polyfill } from './types';

export function getDefaultConfig(basePath: string) {
  const reactNativePath = resolvePackagePath(basePath, 'react-native');

  const defaultConfig = {
    root: basePath,
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
    },
    terminal: {
      status: process.stderr.isTTY ? 'progress' : 'compat',
    },
    reporter: new TerminalReporter() as Reporter,
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
export type ResolvedConfig = Config & DefaultConfig;
