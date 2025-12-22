import { describe, it, expect, vitest } from 'vitest';

import type { Plugin } from '../../core/plugins/types';
import type { ResolvedConfig } from '../defaults';
import { invokePluginConfigResolved, resolvePluginConfig } from '../load-config';
import type { Config } from '../types';

describe('resolvePluginConfig', () => {
  it('should resolve plugin config', async () => {
    const baseConfig: Config = {
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
        prelude: ['/path/to/prelude.js'],
        polyfills: [
          {
            type: 'iife',
            code: 'console.log("polyfill")',
          },
        ],
      },
      reactNative: {
        assetRegistryPath: '/path/to/AssetRegistry.js',
      },
    };

    const pluginA: Plugin = {
      name: 'plugin-a',
      config: {
        root: '/plugin-a',
        resolver: {
          sourceExtensions: ['js', 'jsx'],
        },
        transformer: {
          define: {
            'process.env.PLUGIN_A': 'true',
          },
        },
        serializer: {
          prelude: ['/path/to/prelude-plugin-a.js'],
          polyfills: [
            {
              type: 'iife',
              code: 'console.log("polyfill-plugin-a")',
            },
          ],
        },
      },
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      config: () => ({
        root: '/plugin-b',
        resolver: {
          assetExtensions: ['webp'],
          preferNativePlatform: false,
        },
        transformer: {
          define: {
            'process.env.PLUGIN_B': 'true',
          },
        },
        serializer: {
          prelude: ['/path/to/prelude-plugin-b.js'],
          polyfills: [
            {
              type: 'iife',
              code: 'console.log("polyfill-plugin-b")',
            },
          ],
        },
        reactNative: {
          assetRegistryPath: '/path/to/AssetRegistry-plugin-b.js',
        },
      }),
    };

    const pluginC: Plugin = {
      name: 'plugin-c',
      config: (config) => {
        config.root = '/plugin-c';

        if (config.reactNative) {
          config.reactNative.assetRegistryPath = '/path/to/AssetRegistry-plugin-c.js';
        }
      },
    };

    const pluginConfig = await resolvePluginConfig(baseConfig, [pluginA, pluginB, pluginC]);

    expect(pluginConfig).toEqual({
      root: '/plugin-c',
      resolver: {
        sourceExtensions: ['ts', 'tsx', 'js', 'jsx'],
        assetExtensions: ['png', 'jpg', 'webp'],
        preferNativePlatform: false,
      },
      transformer: {
        define: {
          __DEV__: 'true',
          'process.env.PLUGIN_A': 'true',
          'process.env.PLUGIN_B': 'true',
        },
      },
      serializer: {
        prelude: [
          '/path/to/prelude.js',
          '/path/to/prelude-plugin-a.js',
          '/path/to/prelude-plugin-b.js',
        ],
        polyfills: [
          {
            type: 'iife',
            code: 'console.log("polyfill")',
          },
          {
            type: 'iife',
            code: 'console.log("polyfill-plugin-a")',
          },
          {
            type: 'iife',
            code: 'console.log("polyfill-plugin-b")',
          },
        ],
      },
      reactNative: {
        assetRegistryPath: '/path/to/AssetRegistry-plugin-c.js',
      },
    });
  });
});

describe('invokePluginConfigResolved', () => {
  it('should invoke plugin config resolved', async () => {
    const resolvedConfig = {
      root: '/root',
    } as ResolvedConfig;

    const invoked = vitest.fn();
    const pluginA: Plugin = {
      name: 'plugin-a',
      configResolved: (config) => {
        invoked(config);
      },
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      configResolved: async (config) => {
        invoked(config);
      },
    };

    await invokePluginConfigResolved(resolvedConfig, [pluginA, pluginB]);

    expect(invoked).toHaveBeenCalledTimes(2);
    expect(invoked).toHaveBeenNthCalledWith(1, resolvedConfig);
    expect(invoked).toHaveBeenNthCalledWith(2, resolvedConfig);
  });
});
