import { describe, it, expect } from 'vitest';

import { mergeConfig, PluginFlattenConfig } from '../merge-config';

describe('mergeConfig', () => {
  it('should merge configs', () => {
    const reporterA = { update: () => {} };
    const baseConfig: PluginFlattenConfig = {
      root: '/foo',
      resolver: {
        sourceExtensions: ['ts', 'tsx'],
        assetExtensions: ['png', 'jpg'],
        preferNativePlatform: true,
      },
      transformer: {
        define: {
          __DEV__: 'true',
        },
      },
      serializer: {
        prelude: ['/path/to/prelude-a.js'],
        polyfills: [
          {
            type: 'iife',
            code: 'console.log("polyfill-a")',
          },
        ],
      },
      reactNative: {
        assetRegistryPath: '/path/to/AssetRegistry.js',
      },
      reporter: reporterA,
    };

    const configA: PluginFlattenConfig = {
      root: '/bar',
      resolver: {
        sourceExtensions: ['js', 'jsx'],
      },
    };

    const reporterB = { update: () => {} };
    const configB: PluginFlattenConfig = {
      root: '/baz',
      resolver: {
        // Duplicate source extensions should be removed
        sourceExtensions: ['ts', 'jsx'],
      },
      transformer: {
        define: {
          __DEV__: 'false',
          'process.env.NODE_ENV': 'production',
        },
      },
      serializer: {
        prelude: ['/path/to/prelude-b.js'],
        polyfills: [
          {
            type: 'iife',
            code: 'console.log("polyfill-b")',
          },
        ],
      },
      reporter: reporterB,
    };

    const config = mergeConfig(baseConfig, configA, configB);

    expect(config).toEqual({
      root: '/baz',
      resolver: {
        sourceExtensions: ['ts', 'tsx', 'js', 'jsx'],
        assetExtensions: ['png', 'jpg'],
        preferNativePlatform: true,
      },
      transformer: {
        define: {
          __DEV__: 'false',
          'process.env.NODE_ENV': 'production',
        },
      },
      serializer: {
        prelude: ['/path/to/prelude-a.js', '/path/to/prelude-b.js'],
        polyfills: [
          {
            type: 'iife',
            code: 'console.log("polyfill-a")',
          },
          {
            type: 'iife',
            code: 'console.log("polyfill-b")',
          },
        ],
      },
      reactNative: {
        assetRegistryPath: '/path/to/AssetRegistry.js',
      },
      reporter: reporterB,
    });
  });
});
