import fs from 'node:fs';

import { exactRegex, id, include, type TopLevelFilterExpression } from '@rolldown/pluginutils';
import type * as rolldown from 'rolldown';

import { stripFlowSyntax, generateSourceFromAst } from '../../common/transformer';
import { ResolvedConfig } from '../../config';
import { DEFAULT_HMR_CLIENT_PATH } from '../../constants';
import {
  AssetData,
  copyAssetsToDestination,
  generateAssetRegistryCode,
  resolveScaledAssets,
} from '../assets';
import type { BuildMode } from '../types';
import { cacheable } from './utils';
import { TransformFlag, getFlag, setFlag } from './utils/transform-flags';

export interface ReactNativePluginOptions {
  platform: string;
  dev: boolean;
  mode: BuildMode;
  flowFilter: rolldown.HookFilter | TopLevelFilterExpression[];
  codegenFilter: rolldown.HookFilter | TopLevelFilterExpression[];
  assetsDir?: string;
  assetExtensions: string[];
  assetRegistryPath: string;
}

function reactNativePlugin(
  config: ResolvedConfig,
  options: ReactNativePluginOptions,
): rolldown.Plugin[] {
  const { mode, flowFilter, codegenFilter, assetsDir, assetExtensions, assetRegistryPath } =
    options;
  const assetExtensionRegex = new RegExp(`\\.(?:${assetExtensions.join('|')})$`);

  const codegenPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-codegen-marker',
    transform: {
      order: 'pre',
      filter: codegenFilter,
      handler(_code, id) {
        return { meta: setFlag(this, id, TransformFlag.CODEGEN_REQUIRED) };
      },
    },
  };

  const stripFlowSyntaxPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-strip-flow-syntax',
    transform: {
      order: 'pre',
      filter: flowFilter,
      handler(code, id) {
        const flags = getFlag(this, id);

        if (flags & TransformFlag.SKIP_ALL) {
          return;
        }

        if (flags & TransformFlag.CODEGEN_REQUIRED) {
          return { meta: setFlag(this, id, TransformFlag.STRIP_FLOW_REQUIRED) };
        }

        const result = generateSourceFromAst(stripFlowSyntax(code), id);

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

  const assets: AssetData[] = [];
  const assetPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-asset',
    load: {
      filter: [include(id(assetExtensionRegex))],
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
          code: generateAssetRegistryCode(assetRegistryPath, assetData),
          meta: setFlag(this, id, TransformFlag.SKIP_ALL),
          moduleType: 'js',
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

  const hmrClientImplement = fs.readFileSync(require.resolve('rollipop/hmr-client'), 'utf-8');
  const hmrClientPath = require.resolve(
    process.env.ROLLIPOP_HMR_CLIENT_PATH ?? DEFAULT_HMR_CLIENT_PATH,
    {
      paths: [config.root],
    },
  );

  const replaceHMRClientPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-replace-hmr-client',
    resolveId: {
      filter: [include(id(/\/HMRClient\.js$/))],
      async handler(id, importer) {
        const resolvedId = await this.resolve(id, importer, { skipSelf: true });

        if (resolvedId?.id === hmrClientPath) {
          await this.load({ id: resolvedId.id });
        }
      },
    },
    load: {
      filter: [include(id(exactRegex(hmrClientPath)))],
      handler(id) {
        this.debug(`Replacing HMR client: ${id}`);
        return hmrClientImplement;
      },
    },
  };

  const devServerPlugins = mode === 'serve' ? [replaceHMRClientPlugin] : null;

  return [
    cacheable(codegenPlugin),
    cacheable(stripFlowSyntaxPlugin),
    assetPlugin,
    ...(devServerPlugins ?? []),
  ];
}

export { reactNativePlugin as reactNative };
