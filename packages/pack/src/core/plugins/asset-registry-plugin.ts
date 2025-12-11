import path from 'path';
import * as rolldown from 'rolldown';
import { ASSET_EXTENSIONS } from 'src/config/defaults';

export interface AssetRegistryPluginOptions {}

export function assetRegistryPlugin(options: AssetRegistryPluginOptions): rolldown.Plugin {
  ASSET_EXTENSIONS.join('|');
  const assetExtensionRegex = new RegExp(`.(${ASSET_EXTENSIONS.join('|')})$`);

  return {
    name: 'rollipop:asset-registry',
    resolveId(id) {
      if (assetExtensionRegex.test(id)) {
        return id;
      }
    },
    async load(id) {
      if (assetExtensionRegex.test(id)) {
        this.info(`Asset ${id} found`);

        return {
          code: `
          module.exports = require('react-native/Libraries/Image/AssetRegistry').registerAsset(${JSON.stringify(
            {
              __packager_asset: true,
              name: path.basename(id).slice(0, -path.extname(id).length),
              type: path.extname(id).slice(1),
              scales: [1],
              hash: '1234567890',
              httpServerLocation: 'http://localhost:8081/assets/1234567890.png',
              width: 0,
              height: 0,
            },
          )});
          `,
        };
      }
    },
  };
}
