import type * as rolldown from '@rollipop/rolldown';
import { id, include } from '@rollipop/rolldown-pluginutils';
import {
  rollipopReactNativePlugin,
  type RollipopReactNativePluginConfig,
} from '@rollipop/rolldown/experimental';

import { ResolvedConfig } from '../../config';
import {
  AssetData,
  copyAssetsToDestination,
  generateAssetRegistryCode,
  resolveScaledAssets,
} from '../assets';
import type { BuildType } from '../types';
import { TransformFlag, setFlag } from './utils/transform-utils';

export interface ReactNativePluginOptions {
  platform: string;
  buildType: BuildType;
  assetsDir?: string;
  assetExtensions: string[];
  assetRegistryPath: string;
  /**
   * @internal builtin plugin config
   */
  builtinPluginConfig: RollipopReactNativePluginConfig;
}

function reactNativePlugin(
  config: ResolvedConfig,
  options: ReactNativePluginOptions,
): rolldown.Plugin[] {
  const { buildType, assetsDir, assetExtensions, assetRegistryPath, builtinPluginConfig } = options;

  const assets: AssetData[] = [];
  const assetPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-asset',
    load: {
      filter: [include(id(new RegExp(`\\.(?:${assetExtensions.join('|')})$`)))],
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
      if (error || buildType === 'serve') {
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

  return [rollipopReactNativePlugin(builtinPluginConfig), assetPlugin];
}

export { reactNativePlugin as reactNative };
