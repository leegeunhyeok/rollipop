import fs from 'node:fs';

import { isNotNil, merge } from 'es-toolkit';
import type * as rolldown from 'rolldown';
import type { TransformOptions } from 'rolldown/experimental';

import { asLiteral, asIdentifier, iife, nodeEnvironment } from '../common/code';
import { isDebugEnabled } from '../common/debug';
import { statusPresets } from '../common/status-presets';
import { Polyfill, ResolvedConfig } from '../config';
import { GLOBAL_IDENTIFIER } from '../constants';
import { getGlobalVariables } from '../internal/react-native';
import { ResolvedBuildOptions } from '../utils/build-options';
import { prelude, status, reactRefresh, reactNative, json, svg, babel, swc } from './plugins';
import { printPluginLog } from './plugins/context';
import { withPersistCache } from './plugins/utils/persist-cache';
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

  const { platform, dev, cache, minify } = buildOptions;
  const { sourceExtensions, assetExtensions, preferNativePlatform, ...rolldownResolve } =
    config.resolver;
  const { prelude: preludePaths, polyfills } = config.serializer;
  const { flow, babel: babelConfig, swc: swcConfig, ...rolldownTransform } = config.transformer;
  const { codegen, assetRegistryPath } = config.reactNative;

  const resolvedSourceExtensions = config.transformer.svg
    ? [...sourceExtensions, 'svg']
    : sourceExtensions;
  const resolvedAssetExtensions = config.transformer.svg
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
      ? statusPresets.progressBar(
          config.reporter,
          context,
          `[${platform}, ${buildOptions.dev ? 'dev' : 'prod'}]`,
        )
      : statusPresets.compat(config.reporter);

  const inputOptions: rolldown.InputOptions = {
    cwd: config.root,
    input: config.entry,
    platform: 'neutral',
    treeshake: true,
    resolve: mergedResolveOptions,
    transform: mergedTransformOptions,
    plugins: withPersistCache(
      [
        prelude({ modulePaths: preludePaths }),
        reactNative(config, {
          dev,
          platform,
          mode: context.mode,
          codegenFilter: codegen.filter,
          flowFilter: flow.filter,
          assetsDir: buildOptions.assetsDir,
          assetExtensions: resolvedAssetExtensions,
          assetRegistryPath,
        }),
        babel({ rules: babelConfig?.rules }),
        swc({ rules: swcConfig?.rules }),
        svg({ enabled: config.transformer.svg }),
        json(),
        status(statusPreset),
        ...(devServerPlugins ?? []),
        ...(config.plugins ?? []),
      ],
      { enabled: cache, context, sourceExtensions },
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
    postBanner: [...getGlobalVariables(dev, context.mode)].join('\n'),
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

export function getOverrideOptionsForDevServer() {
  const hotRuntimeImplement = fs.readFileSync(require.resolve('rollipop/hmr-runtime'), 'utf-8');

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
      nativeMagicString: true,
    },
    treeshake: false,
  };

  const output: rolldown.OutputOptions = {
    sourcemap: true,
  };

  return { input, output };
}
