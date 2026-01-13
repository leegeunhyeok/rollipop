import fs from 'node:fs';

import type * as rolldown from '@rollipop/rolldown';
import type { TransformOptions } from '@rollipop/rolldown/experimental';
import { isNotNil, merge } from 'es-toolkit';

import { asLiteral, asIdentifier, iife, nodeEnvironment } from '../common/code';
import { isDebugEnabled } from '../common/debug';
import { statusPresets } from '../common/status-presets';
import { Polyfill, type ResolvedConfig } from '../config';
import { GLOBAL_IDENTIFIER } from '../constants';
import { getGlobalVariables } from '../internal/react-native';
import { ResolvedBuildOptions } from '../utils/build-options';
import { resolveHmrConfig } from '../utils/config';
import { loadEnv } from './env';
import { prelude, status, reactRefresh, reactNative, json, svg, babel, swc } from './plugins';
import { printPluginLog } from './plugins/context';
import { getPersistCachePlugins } from './plugins/utils/persist-cache';
import { withTransformBoundary } from './plugins/utils/transform-utils';
import { BundlerContext } from './types';

export interface RolldownOptions {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}

resolveRolldownOptions.cache = new Map<string, RolldownOptions>();

export async function resolveRolldownOptions(
  context: BundlerContext,
  config: ResolvedConfig,
  buildOptions: ResolvedBuildOptions,
): Promise<RolldownOptions> {
  const cachedOptions = resolveRolldownOptions.cache.get(context.id);

  if (cachedOptions != null) {
    return cachedOptions;
  }

  const env = loadEnv(config);
  const { platform, dev, cache, minify } = buildOptions;
  const { sourceExtensions, assetExtensions, preferNativePlatform, ...rolldownResolve } =
    config.resolver;
  const { prelude: preludePaths, polyfills } = config.serializer;
  const { flow, babel: babelConfig, swc: swcConfig, ...rolldownTransform } = config.transformer;
  const { codegen, assetRegistryPath } = config.reactNative;

  const transformSvg = config.transformer.svg;
  const resolvedSourceExtensions = transformSvg ? [...sourceExtensions, 'svg'] : sourceExtensions;
  const resolvedAssetExtensions = transformSvg
    ? assetExtensions.filter((extension) => extension !== 'svg')
    : assetExtensions;

  const mergedResolveOptions = merge(
    {
      extensions: getResolveExtensions({
        sourceExtensions: resolvedSourceExtensions,
        assetExtensions: resolvedAssetExtensions,
        platform,
        preferNativePlatform,
      }),
    } satisfies rolldown.InputOptions['resolve'],
    rolldownResolve,
  );

  const mergedTransformOptions = merge(
    {
      cwd: config.root,
      target: 'es2015',
      jsx: {
        runtime: 'automatic',
        development: dev,
      },
      define: {
        __DEV__: asLiteral(dev),
        global: asIdentifier(GLOBAL_IDENTIFIER),
        'process.env.NODE_ENV': asLiteral(nodeEnvironment(dev)),
        'process.env.DEBUG_ROLLIPOP': asLiteral(isDebugEnabled()),
        ...Object.fromEntries(
          Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, asLiteral(value)]),
        ),
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

  const isDevServerMode = config.mode === 'development' && context.buildType === 'serve';
  const devServerPlugins = isDevServerMode ? [reactRefresh()] : null;
  const { beforeTransform, afterTransform } = getPersistCachePlugins({
    enabled: cache,
    sourceExtensions,
    context,
  });

  const statusOptions = (() => {
    switch (config.terminal.status) {
      case 'compat':
        return statusPresets.compat(config.reporter);

      case 'progress':
        return statusPresets.progressBar(
          config.reporter,
          context,
          `[${platform}, ${buildOptions.dev ? 'dev' : 'prod'}]`,
        );

      case 'none':
      default:
        return statusPresets.none(config.reporter);
    }
  })();

  const inputOptions: rolldown.InputOptions = {
    cwd: config.root,
    input: config.entry,
    platform: 'neutral',
    treeshake: true,
    resolve: mergedResolveOptions,
    transform: mergedTransformOptions,
    plugins: withTransformBoundary(
      [
        prelude({ modulePaths: preludePaths }),
        reactNative(config, {
          dev,
          platform,
          buildType: context.buildType,
          codegenFilter: codegen.filter,
          flowFilter: flow.filter,
          assetsDir: buildOptions.assetsDir,
          assetExtensions: resolvedAssetExtensions,
          assetRegistryPath,
        }),
        json(),
        svg({ enabled: transformSvg }),
        babel(babelConfig),
        swc(swcConfig),
        status(statusOptions),
        devServerPlugins,
        config.plugins,
      ],
      { context, beforeTransform, afterTransform },
    ),
    checks: {
      /**
       * Disable eval check because react-native uses `eval` to execute code.
       */
      eval: false,
      pluginTimings: isDebugEnabled(),
    },
    logLevel: isDebugEnabled() ? 'debug' : 'info',
    onLog(level, log, defaultHandler) {
      if (log.code?.startsWith('PLUGIN_')) {
        printPluginLog(level, log, log.plugin);
      } else {
        defaultHandler(level, log);
      }
    },
  };

  const outputOptions: rolldown.OutputOptions = {
    postBanner: [...getGlobalVariables(dev, context.buildType)].join('\n'),
    intro: [...loadPolyfills(polyfills)].join('\n'),
    file: buildOptions.outfile,
    minify,
    format: 'iife',
    keepNames: true,
    sourcemap: true,
  };

  const finalOptions = await applyDangerouslyOverrideOptionsFinalizer(
    config,
    inputOptions,
    outputOptions,
  );

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

async function applyDangerouslyOverrideOptionsFinalizer(
  config: ResolvedConfig,
  inputOptions: rolldown.InputOptions,
  outputOptions: rolldown.OutputOptions,
) {
  if (typeof config.dangerously_overrideRolldownOptions === 'function') {
    const resolvedOptions = await config.dangerously_overrideRolldownOptions({
      input: inputOptions,
      output: outputOptions,
    });
    return resolvedOptions;
  }

  return {
    input: merge(inputOptions, config.dangerously_overrideRolldownOptions?.input ?? {}),
    output: merge(outputOptions, config.dangerously_overrideRolldownOptions?.output ?? {}),
  };
}

export function getOverrideOptionsForDevServer(config: ResolvedConfig) {
  const hmrConfig = resolveHmrConfig(config);

  const input: rolldown.InputOptions = {
    transform: {
      jsx: {
        development: true,
      },
    },
    experimental: {
      devMode: hmrConfig ? { implement: hmrConfig.runtimeImplement } : false,
      incrementalBuild: true,
      strictExecutionOrder: true,
      nativeMagicString: true,
    },
    treeshake: false,
  };

  const output: rolldown.OutputOptions = {
    sourcemap: true,
  };

  return { input, output };
}
