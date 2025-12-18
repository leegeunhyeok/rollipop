/**
 * **NOTE**: Type definitions are ported from `metro` implementation.
 *
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/Assets.js
 */

import path from 'node:path';

import { DEV_SERVER_ASSET_PATH } from '@rollipop/common';

export interface AssetInfo {
  files: string[];
  hash: string;
  name: string;
  scales: number[];
  type: string;
}

export interface AssetDataWithoutFiles {
  __packager_asset: boolean;
  fileSystemLocation: string;
  hash: string;
  httpServerLocation: string;
  name: string;
  scales: number[];
  type: string;
  width?: number;
  height?: number;
}

export interface AssetDataFiltered {
  __packager_asset: boolean;
  hash: string;
  httpServerLocation: string;
  name: string;
  scales: number[];
  type: string;
  width?: number;
  height?: number;
}

export interface AssetData extends AssetDataWithoutFiles {
  files: string[];
}

export function getAssetInfo(assetPath: string): AssetInfo {
  const extname = path.extname(assetPath);
  const basename = path.basename(assetPath);

  return {
    files: [assetPath],
    name: basename.slice(0, -extname.length),
    type: extname.slice(1),
    hash: '',
    scales: [1],
  };
}

export function getAssetData(assetPath: string): AssetData {
  const dirname = path.dirname(assetPath);
  return {
    ...getAssetInfo(assetPath),
    __packager_asset: true,
    fileSystemLocation: path.dirname(assetPath),
    httpServerLocation: path.join(DEV_SERVER_ASSET_PATH, dirname),
    width: 0,
    height: 0,
  };
}
