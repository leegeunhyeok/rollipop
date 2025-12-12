import fs from 'node:fs';
import type * as rolldown from 'rolldown';
import { stripFlowSyntax } from 'src/transformer/flow';
import type { ResolvedConfig } from './defaults';
import { isNotNil } from 'es-toolkit';
import { preludePlugin } from 'src/core/plugins/prelude-plugin';
import { codegenPlugin } from 'src/core/plugins/codegen-plugin';
import { stripFlowSyntaxPlugin } from 'src/core/plugins/strip-flow-syntax-plugin';
import { assetRegistryPlugin } from 'src/core/plugins/asset-registry-plugin';
import { persistCachePlugin } from 'src/core/plugins/persist-cache-plugin';
import type { BuildOptions, BundlerContext } from 'src/core/types';

export async function resolveRolldownOptions(
  config: ResolvedConfig,
  context: BundlerContext,
  buildOptions: BuildOptions,
) {
  const { resolver, transformer, serializer, reactNative } = config;
  const { platform, dev, cache = true } = buildOptions;
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
    treeshake: false,
    resolve: {
      extensions: resolveExtensions,
      mainFields: config.resolver.mainFields,
      conditionNames: config.resolver.conditionNames,
    },
    transform: {
      typescript: {
        removeClassFieldsWithoutInitializer: true,
      },
      assumptions: {
        setPublicClassFields: true,
      },
      jsx: {
        development: dev,
        runtime: 'automatic',
      },
      helpers: {
        mode: 'Runtime',
      },
      target: 'es2015',
      define: {
        __DEV__: asLiteral(dev),
        'process.env.NODE_ENV': asLiteral(nodeEnvironment),
        global: '__ROLLIPOP_GLOBAL',
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
    experimental: {
      strictExecutionOrder: true,
      disableLiveBindings: true,
    },
  };

  const polyfillContents = (config.serializer?.polyfills ?? [])
    .map((polyfillPath) =>
      wrapWithIIFE(stripFlowSyntax(fs.readFileSync(polyfillPath, 'utf-8')), polyfillPath),
    )
    .join('\n');

  const outputOptions: rolldown.OutputOptions = {
    intro: [
      `var __BUNDLE_START_TIME__=globalThis.nativePerformanceNow?nativePerformanceNow():Date.now();`,
      `var __DEV__=${dev};`,
      `var process=globalThis.process||{};process.env=process.env||{};process.env.NODE_ENV=process.env.NODE_ENV||"${nodeEnvironment}";`,
      `var __ROLLIPOP_GLOBAL=typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this;`,
      polyfillContents,
    ].join('\n'),
    format: 'iife',
    minify: false,
    keepNames: true,
  };

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

function wrapWithIIFE(body: string, filepath: string) {
  return `
  // ${filepath}
  (function (global) {
  ${indent(body, 1)}
  })(__ROLLIPOP_GLOBAL);
  `;
}

function indent(text: string, indent: number) {
  return text.replace(/^/gm, '\t'.repeat(indent));
}

function asLiteral(value: unknown) {
  return JSON.stringify(value);
}
