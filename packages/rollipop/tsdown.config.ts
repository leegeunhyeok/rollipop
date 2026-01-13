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

const runtimeConfig: UserConfig = {
  outDir: 'dist',
  format: 'esm',
  platform: 'neutral',
  define: {
    globalThis: '__ROLLIPOP_GLOBAL__',
  },
  fixedExtension: false,
  treeshake: false,
  logLevel: 'error',
  plugins: [transformToEs5],
};

export default defineConfig([
  {
    entry: 'src/index.ts',
    outDir: 'dist',
    format: ['esm', 'cjs'],
    platform: 'node',
    define: {
      'globalThis.__ROLLIPOP_VERSION__': JSON.stringify(version),
    },
    fixedExtension: false,
    dts: true,
  },
  {
    entry: 'src/commands.ts',
    outDir: 'dist',
    format: ['esm', 'cjs'],
    platform: 'node',
    fixedExtension: false,
    dts: true,
  },
  {
    entry: 'src/pluginutils.ts',
    outDir: 'dist',
    format: ['esm', 'cjs'],
    platform: 'node',
    fixedExtension: false,
    dts: true,
  },
  {
    ...runtimeConfig,
    entry: 'src/runtime.ts',
    format: ['esm', 'cjs'],
    platform: 'neutral',
    fixedExtension: false,
    dts: true,
  },
  {
    ...runtimeConfig,
    entry: 'src/runtime/hmr-runtime.ts',
  },
  {
    ...runtimeConfig,
    entry: 'src/runtime/hmr-client.ts',
    external: /.*/,
  },
]);
