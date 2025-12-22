import fs from 'node:fs';
import path from 'path';

import * as babel from '@babel/core';
import { exactRegex } from '@rolldown/pluginutils';
import type * as rolldown from 'rolldown';

import { blockScoping, stripFlowSyntax } from '../../common/transformer';
import { ResolvedConfig } from '../../config';
import { DEFAULT_HMR_CLIENT_PATH } from '../../constants';
import { AssetData, copyAssetsToDestination, resolveScaledAssets } from '../assets';
import type { BuildMode } from '../types';
import { PluginUtils } from './utils';

export interface ReactNativePluginOptions {
  platform: string;
  dev: boolean;
  mode: BuildMode;
  flowFilter: rolldown.HookFilter;
  codegenFilter: rolldown.HookFilter;
  assetsDir?: string;
  assetExtensions: string[];
  assetRegistryPath: string;
}

enum TransformFlags {
  SKIP_FLOW = 0b0001,
  NONE = 0,
}

function reactNativePlugin(
  config: ResolvedConfig,
  options: ReactNativePluginOptions,
): rolldown.Plugin[] {
  const { mode, flowFilter, codegenFilter, assetsDir, assetExtensions, assetRegistryPath } =
    options;
  const assetExtensionRegex = new RegExp(`\\.(?:${assetExtensions.join('|')})$`);

  const codegenPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-codegen',
    transform: {
      order: 'pre',
      filter: codegenFilter,
      handler(code, id) {
        this.debug(`Transforming codegen native component ${id}`);

        const result = babel.transformSync(code, {
          filename: path.basename(id),
          babelrc: false,
          configFile: false,
          sourceMaps: true,
          parserOpts: { flow: 'all' } as any,
          plugins: [
            require.resolve('babel-plugin-syntax-hermes-parser'),
            require.resolve('@babel/plugin-transform-flow-strip-types'),
            [
              require.resolve('@babel/plugin-syntax-typescript'),
              {
                isTSX: id.endsWith('x'),
                dts: false,
              },
            ],
            require.resolve('@react-native/babel-plugin-codegen'),
          ],
        });

        if (result?.code == null) {
          throw new Error(`Failed to transform codegen native component: ${id}`);
        }

        return {
          code: result.code,
          map: result.map,
          meta: setFlag(this, id, TransformFlags.SKIP_FLOW),
        };
      },
    },
  };

  const stripFlowSyntaxPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-strip-flow-syntax',
    transform: {
      order: 'pre',
      filter: flowFilter,
      handler(code, id) {
        if (getFlags(this, id) & TransformFlags.SKIP_FLOW) {
          return;
        }

        const result = stripFlowSyntax(code, id);

        return {
          code: result.code,
          map: result.map,
          /**
           * Treat the transformed code as TSX code
           * because Flow modules can be `.js` files with type annotations and JSX syntax.
           */
          moduleType: 'tsx',
        };
      },
    },
  };

  const blockScopingPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-block-scoping',
    transform: {
      order: 'post',
      handler(code, id) {
        const result = blockScoping(code, id);
        return { code: result.code, map: result.map };
      },
    },
  };

  const assets: AssetData[] = [];
  const assetPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-asset',
    load: {
      filter: {
        id: assetExtensionRegex,
      },
      async handler(id) {
        this.debug(`Asset ${id} found`);

        const assetData = await resolveScaledAssets({
          projectRoot: config.root,
          assetPath: id,
          platform: options.platform,
          preferNativePlatform: config.resolver.preferNativePlatform,
        });

        assets.push(assetData);

        return {
          code: `
          module.exports = require('${assetRegistryPath}').registerAsset(${JSON.stringify(
            assetData,
          )});
          `,
        };
      },
    },
    buildStart() {
      assets.length = 0;
    },
    async buildEnd(error) {
      if (error || mode === 'serve') {
        return;
      }

      if (assetsDir != null) {
        this.debug(`Copying assets to ${assetsDir}`);
        await copyAssetsToDestination({
          assets,
          assetsDir,
          platform: options.platform,
          preferNativePlatform: config.resolver.preferNativePlatform,
        });
      }
    },
  };

  const hmrClientImplement = fs.readFileSync(require.resolve('@rollipop/core/hmr-client'), 'utf-8');
  const hmrClientPath = require.resolve(
    process.env.ROLLIPOP_HMR_CLIENT_PATH ?? DEFAULT_HMR_CLIENT_PATH,
    {
      paths: [config.root],
    },
  );

  const replaceHMRClientPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-replace-hmr-client',
    resolveId: {
      filter: {
        id: /\/HMRClient\.js$/,
      },
      async handler(id, importer) {
        const resolvedId = await this.resolve(id, importer, { skipSelf: true });

        if (resolvedId?.id === hmrClientPath) {
          await this.load({ id: resolvedId.id });
        }
      },
    },
    load: {
      filter: {
        id: exactRegex(hmrClientPath),
      },
      handler(id) {
        this.debug(`Replacing HMR client: ${id}`);
        return hmrClientImplement;
      },
    },
  };

  const devServerPlugins = mode === 'serve' ? [replaceHMRClientPlugin] : null;

  return [
    PluginUtils.cacheable(codegenPlugin),
    PluginUtils.cacheable(stripFlowSyntaxPlugin),
    PluginUtils.cacheable(blockScopingPlugin),
    assetPlugin,
    ...(devServerPlugins ?? []),
  ];
}

type ReactNativePluginMeta = rolldown.CustomPluginOptions & {
  flags: TransformFlags;
};

function setFlag(
  context: rolldown.TransformPluginContext,
  id: string,
  flag: TransformFlags,
): rolldown.CustomPluginOptions {
  const moduleInfo = context.getModuleInfo(id);
  if (moduleInfo && hasFlags(moduleInfo.meta)) {
    moduleInfo.meta.flags |= flag;
    return moduleInfo.meta;
  } else {
    return { meta: flag };
  }
}

function hasFlags(meta: rolldown.CustomPluginOptions): meta is ReactNativePluginMeta {
  return 'flags' in meta;
}

function getFlags(context: rolldown.TransformPluginContext, id: string): TransformFlags {
  const moduleInfo = context.getModuleInfo(id);
  if (moduleInfo && hasFlags(moduleInfo.meta)) {
    return moduleInfo.meta.flags;
  }
  return TransformFlags.NONE;
}

export { reactNativePlugin as reactNative };
