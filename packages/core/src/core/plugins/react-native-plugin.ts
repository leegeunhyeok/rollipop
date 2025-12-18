import fs from 'node:fs';
import path from 'path';

import * as babel from '@babel/core';
import { exactRegex } from '@rolldown/pluginutils';
import type * as rolldown from 'rolldown';

import { blockScoping, stripFlowSyntax } from '../../common/transformer';
import { DEFAULT_HMR_CLIENT_PATH } from '../../constants';
import { getAssetData } from '../assets';
import type { BuildMode } from '../types';
import { persistCache } from './persist-cache-plugin';

export interface ReactNativePluginOptions {
  root: string;
  mode: BuildMode;
  flowFilter: rolldown.HookFilter;
  codegenFilter: rolldown.HookFilter;
  assetExtensions: string[];
  assetRegistryPath: string;
}

enum TransformFlags {
  SKIP_FLOW = 0b0001,
  NONE = 0,
}

function reactNativePlugin(options: ReactNativePluginOptions): rolldown.Plugin[] {
  const { root, mode, flowFilter, codegenFilter, assetExtensions, assetRegistryPath } = options;
  const assetExtensionRegex = new RegExp(`\\.(?:${assetExtensions.join('|')})$`);

  const codegenPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-codegen',
    transform: {
      filter: codegenFilter,
      handler(code, id) {
        this.debug(`Transforming codegen native component ${id}`);

        const result = babel.transformSync(code, {
          filename: path.basename(id),
          babelrc: false,
          configFile: false,
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
          meta: setFlag(this, id, TransformFlags.SKIP_FLOW),
        };
      },
    },
  };

  const stripFlowSyntaxPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-strip-flow-syntax',
    transform: {
      filter: flowFilter,
      handler(code, id) {
        if (getFlags(this, id) & TransformFlags.SKIP_FLOW) {
          return;
        }

        return {
          code: stripFlowSyntax(code),
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
        return { code: blockScoping(code, id) };
      },
    },
  };

  const assetPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-asset',
    load: {
      filter: {
        id: assetExtensionRegex,
      },
      handler(id) {
        this.debug(`Asset ${id} found`);

        const assetData = getAssetData(id);

        return {
          code: `
          module.exports = require('${assetRegistryPath}').registerAsset(${JSON.stringify(
            assetData,
          )});
          `,
        };
      },
    },
  };

  const hmrClientImplement = fs.readFileSync(require.resolve('@rollipop/core/hmr-client'), 'utf-8');
  const replaceHMRClientPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-replace-hmr-client',
    transform: {
      filter: {
        id: exactRegex(
          require.resolve(process.env.ROLLIPOP_HMR_CLIENT_PATH ?? DEFAULT_HMR_CLIENT_PATH, {
            paths: [root],
          }),
        ),
      },
      handler(_code, id) {
        this.debug(`Replacing HMR client: ${id}`);
        return hmrClientImplement;
      },
    },
  };

  const devServerPlugins = mode === 'serve' ? [replaceHMRClientPlugin] : null;

  return [
    persistCache.enhance(codegenPlugin),
    persistCache.enhance(stripFlowSyntaxPlugin),
    persistCache.enhance(blockScopingPlugin),
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
