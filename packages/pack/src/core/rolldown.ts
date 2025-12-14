import fs from 'node:fs';

import { Logger, logger } from '@rollipop/common';
import { isNotNil } from 'es-toolkit';
import type * as rolldown from 'rolldown';

import { isDebugEnabled } from '../../../common/src/debug';
import { asLiteral, asIdentifier, iife } from '../common/code';
import { stripFlowSyntax as stripFlowSyntaxTransformer } from '../common/flow';
import { ProgressBarRenderer } from '../common/progress-bar';
import { ResolvedConfig } from '../config';
import { GLOBAL_IDENTIFIER } from '../constants';
import {
  prelude,
  reactNativeCodegen,
  stripFlowSyntax,
  reactNativeAssetRegistry,
  persistCache,
  status,
} from './plugins';
import { BuildOptions, BundlerContext } from './types';

const rolldownLogger = new Logger('rolldown');

export interface RolldownOptions {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}

export async function resolveRolldownOptions(
  config: ResolvedConfig,
  context: BundlerContext,
  buildOptions: BuildOptions,
) {
  const data = context.storage.get();
  const { resolver, transformer, serializer, reactNative } = config;
  const { platform, dev, cache = true, minify = false } = buildOptions;

  const nodeEnvironment = dev ? 'development' : 'production';
  const supportedExtensions = [...resolver.sourceExtensions, ...resolver.assetExtensions];
  const platforms = [platform, resolver.preferNativePlatform ? 'native' : null].filter(isNotNil);
  const resolveExtensions = [
    ...platforms.map((platform) => {
      return supportedExtensions.map((extension) => `.${platform}.${extension}`);
    }),
    ...supportedExtensions.map((extension) => `.${extension}`),
  ].flat();

  let totalModules = data.build[context.buildHash]?.totalModules ?? 0;
  const progressBarRenderer = ProgressBarRenderer.getInstance();
  const progressBar = progressBarRenderer.register(context.buildHash, {
    label: platform,
    total: totalModules,
  });

  const inputOptions: rolldown.InputOptions = {
    cwd: config.root,
    input: config.entry,
    platform: 'neutral',
    treeshake: true,
    resolve: {
      extensions: resolveExtensions,
      mainFields: config.resolver.mainFields,
      conditionNames: config.resolver.conditionNames,
    },
    transform: {
      target: 'es2015',
      define: {
        __DEV__: asLiteral(dev),
        'process.env.NODE_ENV': asLiteral(nodeEnvironment),
        global: asIdentifier(GLOBAL_IDENTIFIER),
      },
      typescript: {
        removeClassFieldsWithoutInitializer: true,
      },
      jsx: {
        development: dev,
        runtime: 'automatic',
      },
      assumptions: {
        setPublicClassFields: true,
      },
      helpers: {
        mode: 'Runtime',
      },
    },
    plugins: [
      prelude({ modulePaths: serializer.prelude }),
      persistCache({ enabled: cache, sourceExtensions: resolver.sourceExtensions }, context),
      persistCache.enhance(reactNativeCodegen(reactNative.codegen)),
      persistCache.enhance(stripFlowSyntax(transformer.flow)),
      reactNativeAssetRegistry({
        assetExtensions: resolver.assetExtensions,
        assetRegistryPath: reactNative.assetRegistryPath,
      }),
      status({
        onStart() {
          progressBar.start();
          progressBarRenderer.start();
        },
        onEnd({ transformedModules, ...state }) {
          progressBar.setTotal(transformedModules).update(state).end();
          progressBarRenderer.release();
          totalModules = transformedModules;
          context.storage.set({
            ...data,
            build: {
              ...data.build,
              [context.buildHash]: { totalModules },
            },
          });
        },
        onTransform({ id, transformedModules }) {
          if (totalModules < transformedModules) {
            totalModules = transformedModules;
            progressBar.setTotal(totalModules);
          }
          progressBar.setCurrent(transformedModules).update({ id });
          progressBarRenderer.render();
        },
      }),
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

  const polyfillContents = loadPolyfills(config.serializer?.polyfills ?? [])
    .map(({ path, content }) => iife(stripFlowSyntaxTransformer(content), path))
    .join('\n');

  const outputOptions: rolldown.OutputOptions = {
    intro: [
      `var __BUNDLE_START_TIME__=globalThis.nativePerformanceNow?nativePerformanceNow():Date.now();`,
      `var __DEV__=${dev};`,
      `var process=globalThis.process||{};process.env=process.env||{};process.env.NODE_ENV=process.env.NODE_ENV||"${nodeEnvironment}";`,
      `var ${GLOBAL_IDENTIFIER}=typeof globalThis!=='undefined'?globalThis:typeof global !== 'undefined'?global:typeof window!=='undefined'?window:this;`,
      polyfillContents,
    ].join('\n'),
    file: buildOptions.outfile,
    minify,
    format: 'iife',
    keepNames: true,
    sourcemap: true,
  };

  const finalOptions = await applyFinalizer(config, inputOptions, outputOptions);

  logger.debug('Resolved rolldown options (input)', finalOptions.input);
  logger.debug('Resolved rolldown options (output)', finalOptions.output);

  return finalOptions;
}

function loadPolyfills(polyfills: string[]) {
  return polyfills.map((polyfillPath) => ({
    path: polyfillPath,
    content: fs.readFileSync(polyfillPath, 'utf-8'),
  }));
}

async function applyFinalizer(
  config: ResolvedConfig,
  inputOptions: rolldown.InputOptions,
  outputOptions: rolldown.OutputOptions,
) {
  if (typeof config.INTERNAL__rolldown === 'function') {
    const resolvedOptions = await config.INTERNAL__rolldown({
      input: inputOptions,
      output: outputOptions,
    });
    return resolvedOptions;
  }

  return {
    input: config.INTERNAL__rolldown?.input ?? inputOptions,
    output: config.INTERNAL__rolldown?.output ?? outputOptions,
  };
}
