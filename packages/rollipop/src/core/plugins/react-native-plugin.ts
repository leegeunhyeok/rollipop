import type * as rolldown from '@rollipop/rolldown';
import { exactRegex, id, include } from '@rollipop/rolldown-pluginutils';
import {
  rollipopReactNativePlugin,
  type RollipopReactNativePluginConfig,
} from '@rollipop/rolldown/experimental';

import { ResolvedConfig } from '../../config';
import { getDefaultRuntimeImplements, resolveHmrConfig } from '../../utils/config';
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
  hmrClientPath: string;
  /**
   * @internal builtin plugin config
   */
  builtinPluginConfig: RollipopReactNativePluginConfig;
}

function reactNativePlugin(
  config: ResolvedConfig,
  options: ReactNativePluginOptions,
): rolldown.Plugin[] {
  const {
    buildType,
    assetsDir,
    assetExtensions,
    assetRegistryPath,
    hmrClientPath,
    builtinPluginConfig,
  } = options;

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

  const defaultRuntimeImplements = getDefaultRuntimeImplements();
  const hmrConfig = resolveHmrConfig(config);
  const replaceHMRClientPlugin: rolldown.Plugin = {
    name: 'rollipop:react-native-replace-hmr-client',
    load: {
      filter: [include(id(exactRegex(hmrClientPath)))],
      handler(id) {
        this.debug(`Replacing HMR client: ${id}`);
        return {
          code: hmrConfig?.clientImplement ?? defaultRuntimeImplements.clientImplement,
          moduleType: 'ts',
        };
      },
    },
  };

  const devServerPlugins = buildType === 'serve' ? [replaceHMRClientPlugin] : null;

  return [rollipopReactNativePlugin(builtinPluginConfig), assetPlugin, ...(devServerPlugins ?? [])];
}

export { reactNativePlugin as reactNative };
