import fs from 'node:fs';

import { isNotNil } from 'es-toolkit';
import type * as rolldown from 'rolldown';

import { asLiteral, asIdentifier, iife } from '../common/code';
import { stripFlowSyntax } from '../common/flow';
import { ResolvedConfig } from '../config';
import { GLOBAL_IDENTIFIER } from '../constants';
import { assetRegistryPlugin } from './plugins/asset-registry-plugin';
import { codegenPlugin } from './plugins/codegen-plugin';
import { persistCachePlugin } from './plugins/persist-cache-plugin';
import { preludePlugin } from './plugins/prelude-plugin';
import { stripFlowSyntaxPlugin } from './plugins/strip-flow-syntax-plugin';
import { BuildOptions, BundlerContext } from './types';

export interface RolldownOptions {
  input?: rolldown.InputOptions;
  output?: rolldown.OutputOptions;
}

export async function resolveRolldownOptions(
  config: ResolvedConfig,
  context: BundlerContext,
  buildOptions: BuildOptions,
) {
  const { resolver, transformer, serializer, reactNative } = config;
  const { platform, dev, cache = true, minify = false } = buildOptions;
  const supportedExtensions = [...resolver.sourceExtensions, ...resolver.assetExtensions];
  const platforms = [platform, resolver.preferNativePlatform ? 'native' : null].filter(isNotNil);
  const resolveExtensions = [
    ...platforms.map((platform) => {
      return supportedExtensions.map((extension) => `.${platform}.${extension}`);
    }),
    ...supportedExtensions.map((extension) => `.${extension}`),
  ].flat();

  const nodeEnvironment = dev ? 'development' : 'production';

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
      preludePlugin({ modulePaths: serializer.prelude }),
      persistCachePlugin({ enabled: cache, sourceExtensions: resolver.sourceExtensions }, context),
      persistCachePlugin.enhance(codegenPlugin(reactNative.codegen)),
      persistCachePlugin.enhance(stripFlowSyntaxPlugin(transformer.flow)),
      assetRegistryPlugin({
        assetExtensions: resolver.assetExtensions,
        assetRegistryPath: reactNative.assetRegistryPath,
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
  };

  const polyfillContents = loadPolyfills(config.serializer?.polyfills ?? [])
    .map(({ path, content }) => iife(stripFlowSyntax(content), path))
    .join('\n');

  const outputOptions: rolldown.OutputOptions = {
    intro: [
      `var __BUNDLE_START_TIME__=globalThis.nativePerformanceNow?nativePerformanceNow():Date.now();`,
      `var __DEV__=${dev};`,
      `var process=globalThis.process||{};process.env=process.env||{};process.env.NODE_ENV=process.env.NODE_ENV||"${nodeEnvironment}";`,
      `var ${GLOBAL_IDENTIFIER}=typeof globalThis!=='undefined'?globalThis:typeof global !== 'undefined'?global:typeof window!=='undefined'?window:this;`,
      polyfillContents,
    ].join('\n'),
    minify,
    format: 'iife',
    keepNames: true,
  };

  const finalOptions = await applyFinalizer(config, inputOptions, outputOptions);

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
