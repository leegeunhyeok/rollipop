import fs from 'node:fs';

import type * as rolldown from '@rollipop/rolldown';
import { rollipopReactRefreshWrapperPlugin as reactRefresh } from '@rollipop/rolldown/experimental';
import type { TransformOptions } from '@rollipop/rolldown/utils';
import { invariant, isNotNil, merge } from 'es-toolkit';

import { asLiteral, asIdentifier, iife, nodeEnvironment } from '../common/code';
import { isDebugEnabled } from '../common/env';
import { Polyfill, type ResolvedConfig } from '../config';
import { GLOBAL_IDENTIFIER } from '../constants';
import { getGlobalVariables } from '../internal/react-native';
import { ResolvedBuildOptions } from '../utils/build-options';
import { resolveHmrConfig } from '../utils/config';
import { defineEnvFromObject } from '../utils/env';
import { resolveFrom } from '../utils/node-resolve';
import {
  CompatStatusReporter,
  mergeReporters,
  ProgressBarStatusReporter,
} from '../utils/reporters';
import { getBaseUrl } from '../utils/server';
import { getBuildTotalModules } from '../utils/storage';
import { loadEnv } from './env';
import { prelude, reporter, reactNative, json, svg, babel, swc } from './plugins';
import { printPluginLog } from './plugins/context';
import { withTransformBoundary } from './plugins/utils/transform-utils';
import type { BundlerContext, DevEngineOptions } from './types';

export interface RolldownOptions {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}

resolveRolldownOptions.cache = new Map<string, RolldownOptions>();

export async function resolveRolldownOptions(
  context: BundlerContext,
  config: ResolvedConfig,
  buildOptions: ResolvedBuildOptions,
  devEngineOptions?: DevEngineOptions,
): Promise<RolldownOptions> {
  const cachedOptions = resolveRolldownOptions.cache.get(context.id);

  if (cachedOptions != null) {
    return cachedOptions;
  }

  const { platform, dev, cache } = buildOptions;
  const isDevServerMode = dev && context.buildType === 'serve';

  invariant(
    isDevServerMode ? devEngineOptions != null : true,
    'devEngineOptions is required in dev server mode',
  );

  const env = loadEnv(config);
  const builtInEnv = {
    MODE: config.mode,
    ...(isDevServerMode
      ? {
          BASE_URL: getBaseUrl(
            devEngineOptions!.host,
            devEngineOptions!.port,
            devEngineOptions!.https,
          ),
        }
      : null),
  };

  // Resolver
  const {
    sourceExtensions,
    assetExtensions,
    preferNativePlatform,
    external: rolldownExternal,
    ...rolldownResolve
  } = config.resolver;

  // Serializer
  const {
    polyfills,
    prelude: preludePaths,
    banner: rolldownBanner,
    footer: rolldownFooter,
    postBanner: rolldownPostBanner,
    postFooter: rolldownPostFooter,
    intro: rolldownIntro,
    outro: rolldownOutro,
    shimMissingExports: rolldownShimMissingExports,
  } = config.serializer;

  // Transformer
  const { flow, babel: babelConfig, swc: swcConfig, ...rolldownTransform } = config.transformer;

  // Optimization
  const {
    treeshake: rolldownTreeshake,
    minify: rolldownMinify,
    lazyBarrel: rolldownLazyBarrel,
    ...rolldownOptimization
  } = config.optimization;

  // React Native specific options
  const {
    codegen,
    assetRegistryPath,
    hmrClientPath,
    globalIdentifiers: rolldownGlobalIdentifiers,
  } = config.reactNative;

  // Sourcemap specific options
  const {
    sourcemap: rolldownSourcemap,
    sourcemapBaseUrl: rolldownSourcemapBaseUrl,
    sourcemapDebugIds: rolldownSourcemapDebugIds,
    sourcemapIgnoreList: rolldownSourcemapIgnoreList,
    sourcemapPathTransform: rolldownSourcemapPathTransform,
  } = config;

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
      target: 'esnext',
      jsx: {
        runtime: 'automatic',
        development: dev,
      },
      define: {
        __DEV__: asLiteral(dev),
        global: asIdentifier(GLOBAL_IDENTIFIER),
        'process.env.NODE_ENV': asLiteral(nodeEnvironment(dev)),
        'process.env.DEBUG_ROLLIPOP': asLiteral(isDebugEnabled()),
        ...defineEnvFromObject(env),
        ...defineEnvFromObject(builtInEnv),
      },
      helpers: {
        mode: 'Runtime',
      },
    } satisfies TransformOptions,
    rolldownTransform,
  );

  const devServerPlugins = isDevServerMode
    ? [
        reactRefresh({
          cwd: config.root,
          include: [/\.[tj]sx?(?:$|\?)/],
          exclude: [/\/node_modules\//],
        }),
      ]
    : null;

  const statusReporter = (() => {
    switch (config.terminal.status) {
      case 'compat':
        return new CompatStatusReporter();

      case 'progress':
        return new ProgressBarStatusReporter(
          context.id,
          `[${platform}, ${buildOptions.dev ? 'dev' : 'prod'}]`,
          getBuildTotalModules(context.storage, context.id),
        );
    }
  })();

  const defaultReporters = [statusReporter];
  const reporterOptions = {
    initialTotalModules: getBuildTotalModules(context.storage, context.id),
    reporter: mergeReporters([...defaultReporters, config.reporter].filter(isNotNil)),
  };

  const inputOptions: rolldown.InputOptions = {
    platform: 'neutral',
    cwd: config.root,
    input: config.entry,
    tsconfig: config.tsconfig,
    resolve: mergedResolveOptions,
    transform: mergedTransformOptions,
    treeshake: rolldownTreeshake,
    external: rolldownExternal,
    shimMissingExports: rolldownShimMissingExports,
    optimization: {
      ...rolldownOptimization,
      inlineConst: false,
    },
    experimental: {
      lazyBarrel: rolldownLazyBarrel,
    },
    plugins: withTransformBoundary(context, [
      prelude({ modulePaths: preludePaths }),
      reactNative(config, {
        dev,
        platform,
        buildType: context.buildType,
        codegenFilter: codegen.filter,
        flowFilter: flow.filter,
        assetsDir: buildOptions.assetsDir,
        assetExtensions: resolvedAssetExtensions,
        assetRegistryPath: resolveFrom(
          config.root,
          typeof assetRegistryPath === 'function'
            ? await assetRegistryPath(config.root)
            : assetRegistryPath,
        ),
        hmrClientPath: resolveFrom(
          config.root,
          typeof hmrClientPath === 'function' ? await hmrClientPath(config.root) : hmrClientPath,
        ),
      }),
      json(),
      svg({ enabled: transformSvg }),
      babel(babelConfig),
      swc(swcConfig),
      reporter(reporterOptions),
      devServerPlugins,
      config.plugins,
    ]),
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
    // `@rollipop/rolldown` specific options
    id: context.id,
  };

  const outputOptions: rolldown.OutputOptions = {
    format: 'esm',
    file: buildOptions.outfile,
    banner: rolldownBanner,
    footer: rolldownFooter,
    postFooter: rolldownPostFooter,
    postBanner: rolldownPostBanner,
    outro: rolldownOutro,
    intro: async (chunk) => {
      return [
        ...getGlobalVariables(dev, context.buildType),
        ...loadPolyfills(polyfills),
        typeof rolldownIntro === 'function' ? await rolldownIntro(chunk) : rolldownIntro,
      ]
        .filter(isNotNil)
        .join('\n');
    },
    minify: buildOptions.minify ?? rolldownMinify,
    sourcemap: buildOptions.sourcemap ?? rolldownSourcemap,
    sourcemapBaseUrl: rolldownSourcemapBaseUrl,
    sourcemapDebugIds: rolldownSourcemapDebugIds,
    sourcemapIgnoreList: rolldownSourcemapIgnoreList,
    sourcemapPathTransform: rolldownSourcemapPathTransform,
    codeSplitting: false,
    strictExecutionOrder: true,
    // `@rollipop/rolldown` specific options
    globalIdentifiers: rolldownGlobalIdentifiers,
    persistentCache: cache,
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

export function getOverrideOptionsForDevServer(
  config: ResolvedConfig,
  buildOptions: ResolvedBuildOptions,
) {
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
      nativeMagicString: true,
    },
    treeshake: false,
  };

  const output: rolldown.OutputOptions = {
    minify: buildOptions.minify ?? false,
    sourcemap: buildOptions.sourcemap ?? true,
    generatedCode: {
      symbols: buildOptions.dev,
      profilerNames: buildOptions.dev,
    },
  };

  return { input, output };
}
