import type * as rolldown from 'rolldown';
import { getAssetData } from '../assets';

export interface AssetRegistryPluginOptions {
  assetExtensions: string[];
  assetRegistryPath: string;
}

export function assetRegistryPlugin(options: AssetRegistryPluginOptions): rolldown.Plugin {
  const { assetExtensions, assetRegistryPath } = options;

  return {
    name: 'rollipop:asset-registry',
    load: {
      filter: {
        id: new RegExp(`\\.(?:${assetExtensions.join('|')})$`),
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
}
