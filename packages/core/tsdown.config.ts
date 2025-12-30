import fs from 'node:fs';
import path from 'node:path';

import { invariant } from 'es-toolkit';
import { defineConfig, type UserConfig } from 'tsdown';

const rawPackageJson = fs.readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf-8');
const { version } = JSON.parse(rawPackageJson);
invariant(version, 'could not find version in package.json');

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
    format: 'cjs',
    banner: {
      /**
       * @see https://github.com/facebook/react-native/blob/0.83-stable/packages/react-native/Libraries/Utilities/HMRClient.js
       */
      js: [
        `import LogBox from '../LogBox/LogBox';`,
        `import NativeRedBox from '../NativeModules/specs/NativeRedBox';`,
      ].join('\n'),
    },
    external: /.*/,
  },
]);
