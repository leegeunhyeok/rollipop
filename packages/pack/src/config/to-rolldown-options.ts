import fs from 'node:fs';
import type * as rolldown from 'rolldown';
import { transformPolyfills } from 'src/utils/transform-polyfills';
import { stripFlowSyntax } from 'src/transformer/flow';
import { RESOLVER_MAIN_FIELDS, SOURCE_EXTENSIONS } from './defaults';
import type { Config } from './types';

export function toRolldownOptions(config: Config, platform: string) {
  const supportedExtensions = [...SOURCE_EXTENSIONS];
  const resolveExtensions = [
    ...[platform, 'native'].map((platform) => {
      return supportedExtensions.map((extension) => `.${platform}.${extension}`);
    }),
    ...supportedExtensions.map((extension) => `.${extension}`),
  ].flat();

  const inputOptions: rolldown.InputOptions = {
    input: config.entry,
    resolve: {
      extensions: [...resolveExtensions],
      mainFields: RESOLVER_MAIN_FIELDS,
      conditionNames: ['react-native', 'import', 'require'],
    },
    transform: {
      typescript: {
        removeClassFieldsWithoutInitializer: true,
      },
      assumptions: {
        setPublicClassFields: true,
      },
      jsx: {
        development: true,
        runtime: 'automatic',
      },
      helpers: {
        mode: 'Runtime',
      },
      target: 'es2015',
      define: {
        __DEV__: JSON.stringify(true),
        'process.env.NODE_ENV': JSON.stringify('development'),
        global: '__ROLLIPOP_GLOBAL',
      },
    },
    experimental: {
      strictExecutionOrder: true,
      disableLiveBindings: true,
    },
    platform: 'neutral',
    treeshake: false,
    cwd: config.root,
    checks: {
      /**
       * Disable eval check because react-native uses `eval` to execute code.
       */
      eval: false,
    },
  };

  const polyfillContents = (config.serializer?.polyfills ?? [])
    .map((polyfillPath) =>
      wrapWithIIFE(stripFlowSyntax(fs.readFileSync(polyfillPath, 'utf-8')), polyfillPath),
    )
    .join('\n');

  const outputOptions: rolldown.OutputOptions = {
    intro: [
      `var __BUNDLE_START_TIME__=globalThis.nativePerformanceNow?nativePerformanceNow():Date.now(),__DEV__=true,process=globalThis.process||{};process.env=process.env||{};process.env.NODE_ENV=process.env.NODE_ENV||"development";`,
      `var __ROLLIPOP_GLOBAL = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this;`,
      polyfillContents,
    ].join('\n'),
    format: 'iife',
    minify: false,
    keepNames: true,
    topLevelVar: false,
  };

  return {
    input: inputOptions,
    output: outputOptions,
  };
}

function wrapWithIIFE(body: string, filepath: string) {
  return `
  // ${filepath}
  (function (global) {
  ${indent(body, 2)}
  })(__ROLLIPOP_GLOBAL);
  `;
}

function indent(text: string, indent: number) {
  return text.replace(/^/gm, ' '.repeat(indent));
}
