import fs from 'node:fs';
import path from 'node:path';

import type { RolldownPluginOption } from '@rollipop/rolldown';
import * as swc from '@swc/core';
import { invariant } from 'es-toolkit';
import { defineConfig, type UserConfig } from 'tsdown';

const rawPackageJson = fs.readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf-8');
const { version } = JSON.parse(rawPackageJson);
invariant(version, 'could not find version in package.json');

const transformToEs5: RolldownPluginOption = {
  name: 'transform-to-es5',
  transform(code, id) {
    const result = swc.transformSync(code, {
      filename: id,
      configFile: false,
      swcrc: false,
      sourceMaps: false,
      inputSourceMap: false,
      jsc: {
        target: 'es5',
        parser: {
          syntax: 'typescript',
        },
        keepClassNames: true,
        loose: false,
        assumptions: {
          setPublicClassFields: true,
          privateFieldsAsProperties: true,
        },
        minify: {
          // To avoid mangling the rolldown runtime variable names
          mangle: true,
        },
      },
      isModule: true,
    });

    return { code: result.code, map: result.map };
  },
};

const commonConfig: UserConfig = {
  outDir: 'dist',
  fixedExtension: false,
  checks: {
    pluginTimings: false,
  },
};

const runtimeConfig: UserConfig = {
  format: 'esm',
  platform: 'neutral',
  define: {
    globalThis: '__ROLLIPOP_GLOBAL__',
  },
  treeshake: false,
  logLevel: 'error',
  plugins: [transformToEs5],
};

export default defineConfig([
  {
    ...commonConfig,
    entry: 'src/index.ts',
    format: 'esm',
    platform: 'node',
    define: {
      'globalThis.__ROLLIPOP_VERSION__': JSON.stringify(version),
    },
    dts: true,
  },
  {
    ...commonConfig,
    entry: 'src/commands.ts',
    format: ['esm', 'cjs'],
    platform: 'node',
    dts: true,
  },
  {
    ...commonConfig,
    entry: 'src/pluginutils.ts',
    format: 'esm',
    platform: 'node',
    dts: true,
  },
  {
    ...runtimeConfig,
    entry: 'src/runtime.ts',
    format: ['esm', 'cjs'],
    platform: 'neutral',
    dts: true,
  },
  {
    ...runtimeConfig,
    format: 'iife',
    entry: 'src/runtime/hmr-runtime.ts',
    deps: {
      alwaysBundle: ['mitt'],
      onlyBundle: false,
    },
  },
]);
