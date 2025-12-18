import fs from 'node:fs';

import { Logger } from '@rollipop/common';
import { isNotNil, merge } from 'es-toolkit';
import type * as rolldown from 'rolldown';
import type { TransformOptions } from 'rolldown/experimental';

import { isDebugEnabled } from '../../../common/src/debug';
import { DevServerOptions } from '../../../dev-server/src/instance-manager';
import { asLiteral, asIdentifier, iife, nodeEnvironment } from '../common/code';
import { statusPresets } from '../common/status-presets';
import { Polyfill, ResolvedConfig } from '../config';
import { GLOBAL_IDENTIFIER } from '../constants';
import { getGlobalVariables } from '../internal/react-native';
import { prelude, persistCache, status, reactRefresh, reactNative, json } from './plugins';
import { BuildOptions, BundlerContext } from './types';

const rolldownLogger = new Logger('rolldown');

export function resolveBuildOptions(buildOptions: BuildOptions) {
  return merge(
    {
      dev: true,
      cache: true,
      minify: false,
    },
    buildOptions,
  );
}

export interface RolldownOptions {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}

resolveRolldownOptions.cache = new Map<string, RolldownOptions>();

export async function resolveRolldownOptions(
  context: BundlerContext,
  config: ResolvedConfig,
  buildOptions: BuildOptions,
): Promise<RolldownOptions> {
  const cachedOptions = resolveRolldownOptions.cache.get(context.id);

  if (cachedOptions != null) {
    return cachedOptions;
  }

  const { platform, dev, cache, minify } = resolveBuildOptions(buildOptions);
  const { sourceExtensions, assetExtensions, preferNativePlatform, ...rolldownResolve } =
    config.resolver;
  const { prelude: preludePaths, polyfills } = config.serializer;
  const { flow, ...rolldownTransform } = config.transformer;
  const { codegen, assetRegistryPath } = config.reactNative;

  const mergedResolveOptions = merge(
    {
      extensions: getResolveExtensions({
        sourceExtensions,
        assetExtensions,
        platform,
        preferNativePlatform,
      }),
    } satisfies rolldown.InputOptions['resolve'],
    rolldownResolve,
  );

  const mergedTransformOptions = merge(
    {
      target: 'es2015',
      define: {
        __DEV__: asLiteral(dev),
        'process.env.NODE_ENV': asLiteral(nodeEnvironment(dev)),
        global: asIdentifier(GLOBAL_IDENTIFIER),
      },
      typescript: {
        removeClassFieldsWithoutInitializer: true,
      },
      assumptions: {
        setPublicClassFields: true,
      },
      helpers: {
        mode: 'Runtime',
      },
    } satisfies TransformOptions,
    rolldownTransform,
  );

  const devServerPlugins = context.mode === 'serve' ? [reactRefresh()] : [];

  const statusPreset =
    config.terminal.status === 'progress'
      ? statusPresets.progressBar(context, `[${platform}, ${buildOptions.dev ? 'dev' : 'prod'}]`)
      : statusPresets.compat();

  const inputOptions: rolldown.InputOptions = {
    cwd: config.root,
    input: config.entry,
    platform: 'neutral',
    treeshake: true,
    resolve: mergedResolveOptions,
    transform: mergedTransformOptions,
    plugins: [
      prelude({ modulePaths: preludePaths }),
      persistCache({ enabled: cache, sourceExtensions }, context),
      reactNative({
        root: config.root,
        mode: context.mode,
        codegenFilter: codegen.filter,
        flowFilter: flow.filter,
        assetExtensions,
        assetRegistryPath,
      }),
      json(),
      status(statusPreset),
      ...(devServerPlugins ?? []),
      ...(config.plugins ?? []),
    ],
    checks: {
      /**
       * Disable eval check because react-native uses `eval` to execute code.
       */
      eval: false,
      pluginTimings: false,
    },
    logLevel: isDebugEnabled() ? 'debug' : 'info',
    onLog(level, log) {
      const { message, code } = log;
      const logArgs = [code, message].filter(isNotNil);

      switch (level) {
        case 'debug':
          rolldownLogger.debug(...logArgs);
          break;

        case 'info':
          rolldownLogger.info(...logArgs);
          break;

        case 'warn':
          rolldownLogger.warn(...logArgs);
          break;
      }
    },
  };

  const outputOptions: rolldown.OutputOptions = {
    banner: [...getGlobalVariables(dev, context.mode)].join('\n'),
    intro: [...loadPolyfills(polyfills)].join('\n'),
    file: buildOptions.outfile,
    minify,
    format: 'iife',
    keepNames: true,
    sourcemap: true,
  };

  const finalOptions = await applyFinalizer(config, inputOptions, outputOptions);

  resolveRolldownOptions.cache.set(context.id, finalOptions);

  return finalOptions;
}

export interface GetResolveExtensionsOptions {
  platform: string;
  sourceExtensions: string[];
  assetExtensions: string[];
  preferNativePlatform: boolean;
}

export function getResolveExtensions({
  platform,
  sourceExtensions,
  assetExtensions,
  preferNativePlatform,
}: GetResolveExtensionsOptions) {
  const supportedExtensions = [...sourceExtensions, ...assetExtensions];
  const platforms = [platform, preferNativePlatform ? 'native' : null].filter(isNotNil);
  const resolveExtensions = [
    ...platforms.map((platform) => {
      return supportedExtensions.map((extension) => `.${platform}.${extension}`);
    }),
    ...supportedExtensions.map((extension) => `.${extension}`),
  ].flat();

  return resolveExtensions;
}

function loadPolyfills(polyfills: Polyfill[]) {
  return polyfills.map((polyfill) => {
    if (typeof polyfill === 'string') {
      return fs.readFileSync(polyfill, 'utf-8');
    }

    const path = 'path' in polyfill ? polyfill.path : undefined;
    const content = 'code' in polyfill ? polyfill.code : fs.readFileSync(polyfill.path, 'utf-8');

    return polyfill.type === 'iife' ? iife(content, path) : content;
  });
}

async function applyFinalizer(
  config: ResolvedConfig,
  inputOptions: rolldown.InputOptions,
  outputOptions: rolldown.OutputOptions,
) {
  if (typeof config.rolldown === 'function') {
    const resolvedOptions = await config.rolldown({
      input: inputOptions,
      output: outputOptions,
    });
    return resolvedOptions;
  }

  return {
    input: merge(inputOptions, config.rolldown?.input ?? {}),
    output: merge(outputOptions, config.rolldown?.output ?? {}),
  };
}

export function getOverrideOptionsForDevServer(devServerOptions: DevServerOptions) {
  const hotRuntimeImplement = fs.readFileSync(
    require.resolve('@rollipop/core/hmr-runtime'),
    'utf-8',
  );

  const input: rolldown.InputOptions = {
    transform: {
      jsx: {
        development: true,
      },
    },
    experimental: {
      devMode: {
        implement: hotRuntimeImplement,
      },
      incrementalBuild: true,
      strictExecutionOrder: true,
    },
    treeshake: false,
  };

  const output: rolldown.OutputOptions = {
    sourcemap: true,
    sourcemapBaseUrl: `http://${devServerOptions.host}:${devServerOptions.port}`,
  };

  return { input, output };
}
