/**
 * **NOTE**: Type definitions are ported from `metro` implementation.
 *
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/Assets.js
 */

import fs from 'node:fs';
import path from 'node:path';

import { isNotNil } from 'es-toolkit';
import { imageSize } from 'image-size';

import { DEV_SERVER_ASSET_PATH } from '../server';
import { md5 } from '../utils/hash';

export interface AssetContext {
  platform: string;
  preferNativePlatform: boolean;
}

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
  scales: AssetScale[];
  type: string;
  width?: number;
  height?: number;
}

export interface AssetDataFiltered {
  __packager_asset: boolean;
  hash: string;
  httpServerLocation: string;
  name: string;
  scales: AssetScale[];
  type: string;
  width?: number;
  height?: number;
}

export interface AssetData extends AssetDataWithoutFiles {
  id: string;
  files: string[];
}

export type AssetScale = 0.75 | 1 | 1.5 | 2 | 3;

const SCALE_PATTERN = '@(\\d+\\.?\\d*)x';

/**
 * key: platform,
 * value: allowed scales
 *
 * @see https://github.com/facebook/react-native/blob/0.83-stable/packages/community-cli-plugin/src/commands/bundle/filterPlatformAssetScales.js#L11
 */
const ALLOW_SCALES: Partial<Record<string, number[]>> = {
  ios: [1, 2, 3],
};

/**
 * @see https://developer.android.com/training/multiscreen/screendensities#TaskProvideAltBmp
 */
const ANDROID_ASSET_QUALIFIER: Record<number, string> = {
  0.75: 'ldpi',
  1: 'mdpi',
  1.5: 'hdpi',
  2: 'xhdpi',
  3: 'xxhdpi',
  4: 'xxxhdpi',
} as const;

interface ResolveScaledAssetsOptions {
  projectRoot: string;
  assetPath: string;
  platform: string;
  preferNativePlatform: boolean;
}

export async function resolveScaledAssets(options: ResolveScaledAssetsOptions): Promise<AssetData> {
  const { projectRoot, assetPath, platform, preferNativePlatform } = options;
  const context = { platform, preferNativePlatform };
  const extension = path.extname(assetPath);
  const relativePath = path.relative(projectRoot, assetPath);
  const dirname = path.dirname(assetPath);
  const files = fs.readdirSync(dirname);
  const stripedBasename = stripSuffix(assetPath, context);
  const suffixPattern = platformSuffixPattern(context);
  const assetRegExp = new RegExp(
    `${stripedBasename}(${SCALE_PATTERN})?(?:${suffixPattern})?${extension}$`,
  );
  const scaledAssets: Partial<Record<AssetScale, string>> = {};

  for (const file of files.sort(
    (a, b) => getAssetPriority(b, context) - getAssetPriority(a, context),
  )) {
    const match = assetRegExp.exec(file);
    if (match) {
      const [, , scale = '1'] = match;
      if (scaledAssets[scale as unknown as AssetScale]) continue;
      scaledAssets[scale as unknown as AssetScale] = file;
    }
  }

  if (!(Object.keys(scaledAssets).length && scaledAssets[1])) {
    throw new Error(`cannot resolve base asset of ${assetPath}`);
  }

  const imageData = fs.readFileSync(assetPath);
  const dimensions = imageSize(imageData);

  const filteredScaledAssets = Object.entries(scaledAssets)
    .map(([scale, file]) => ({ scale: parseFloat(scale) as AssetScale, file }))
    .filter(({ scale }) => ALLOW_SCALES[platform]?.includes(scale) ?? true)
    .reduce(
      (acc, { scale, file }) => {
        acc.files.push(file);
        acc.scales.push(scale);
        return acc;
      },
      { scales: [], files: [] } as { scales: AssetScale[]; files: string[] },
    );

  return {
    __packager_asset: true,
    id: assetPath,
    name: stripedBasename.replace(extension, ''),
    type: extension.substring(1),
    width: dimensions.width,
    height: dimensions.height,
    files: filteredScaledAssets.files,
    scales: filteredScaledAssets.scales,
    fileSystemLocation: path.dirname(assetPath),
    httpServerLocation: path.join(DEV_SERVER_ASSET_PATH, path.dirname(relativePath)),
    hash: md5(imageData),
  };
}

export function platformSuffixPattern(context: AssetContext) {
  return [context.platform, context.preferNativePlatform ? 'native' : null]
    .filter(isNotNil)
    .map((platform) => `.${platform}`)
    .join('|');
}

export function stripSuffix(assetPath: string, context: AssetContext) {
  const basename = path.basename(assetPath);
  const extension = path.extname(assetPath);
  const suffixPattern = platformSuffixPattern(context);
  return basename.replace(new RegExp(`(${SCALE_PATTERN})?(?:${suffixPattern})?${extension}$`), '');
}

export function getAssetPriority(assetPath: string, context: AssetContext) {
  const suffixPattern = platformSuffixPattern(context);
  if (new RegExp(`${SCALE_PATTERN}(?:${suffixPattern})`).test(assetPath)) {
    return 3;
  } else if (new RegExp(`(?:${suffixPattern})`).test(assetPath)) {
    return 2;
  } else if (new RegExp(`${SCALE_PATTERN}`).test(assetPath)) {
    return 1;
  }
  return 0;
}

interface AddSuffixOptions {
  scale?: AssetScale;
  platform?: string;
}

function addSuffix(assetPath: string, context: AssetContext, options: AddSuffixOptions) {
  const extension = path.extname(assetPath);
  return stripSuffix(assetPath, context)
    .concat(options?.scale ? `@${options.scale}x` : '')
    .concat(options?.platform ? `.${options.platform}${extension}` : extension);
}

interface GetSuffixedPathOptions {
  scale?: AssetScale;
  platform?: string;
}

/**
 * add suffix to asset path
 *
 * ```js
 * // assetPath input
 * '/path/to/assets/image.png'
 *
 * // `platform` suffixed
 * '/path/to/assets/image.android.png'
 *
 * // `scale` suffixed
 * '/path/to/assets/image@1x.png'
 *
 * // both `platform` and `scale` suffixed
 * '/path/to/assets/image@1x.android.png'
 * ```
 */
export function getSuffixedPath(
  assetPath: string,
  context: AssetContext,
  options: GetSuffixedPathOptions,
) {
  // if `scale` present, append scale suffix to path
  // assetPath: '/path/to/assets/image.png'
  // result:
  //   '/path/to/assets/image.png'
  //   '/path/to/assets/image.{platform}.png'
  //   '/path/to/assets/image@{scale}x.png'
  //   '/path/to/assets/image@{scale}x.{platform}.png'
  // strip exist suffixes and add new options based suffixes
  const suffixedBasename = addSuffix(assetPath, context, {
    scale: options?.scale,
    platform: options?.platform,
  });
  const dirname = path.dirname(assetPath);

  return path.join(dirname, suffixedBasename);
}

export function resolveAssetPath(assetPath: string, context: AssetContext, scale: AssetScale) {
  const suffixedPaths = [
    getSuffixedPath(assetPath, context, { scale, platform: context.platform }),
    context.preferNativePlatform
      ? getSuffixedPath(assetPath, context, { scale, platform: 'native' })
      : null,
    getSuffixedPath(assetPath, context, { scale }),
  ].filter(isNotNil);

  /**
   * When scale is 1, filename can be suffixed or non-suffixed(`image.png`).
   *
   * - Suffixed
   *   - `filename.<platform>@<scale>x.ext`
   *   - `filename.<platform>.ext`
   *   - `filename@<scale>x.ext`
   * - Non suffixed
   *   - `filename.ext`
   *
   * 1. Resolve non-suffixed asset first.
   * 2. If file is not exist, resolve suffixed path.
   */
  if (scale === 1) {
    try {
      fs.statSync(assetPath);
      return assetPath;
    } catch {}
  }

  for (const suffixedPath of suffixedPaths) {
    try {
      fs.statSync(suffixedPath);
      return suffixedPath;
    } catch {}
  }

  throw new Error(`cannot resolve asset path for ${assetPath}`);
}

interface CopyAssetsToDestinationOptions {
  assets: AssetData[];
  assetsDir: string;
  platform: string;
  preferNativePlatform: boolean;
}

/**
 * @see https://github.com/facebook/react-native/blob/0.83-stable/packages/community-cli-plugin/src/commands/bundle/assetPathUtils.js
 */
export async function copyAssetsToDestination(options: CopyAssetsToDestinationOptions) {
  const { assets, platform, assetsDir, preferNativePlatform } = options;
  const context = { platform, preferNativePlatform };

  const mkdirWithAssertPath = (targetPath: string) => {
    const dirname = path.dirname(targetPath);
    fs.mkdirSync(dirname, { recursive: true });
  };

  return Promise.all(
    assets.map((asset): Promise<void> => {
      return Promise.all(
        asset.scales.map(async (scale) => {
          if (platform !== 'android') {
            const from = resolveAssetPath(asset.id, context, scale);
            const to = path.join(assetsDir, getIosAssetDestinationPath(asset, scale));
            mkdirWithAssertPath(to);
            return fs.copyFileSync(from, to);
          }

          const from = resolveAssetPath(asset.id, context, scale);
          const to = path.join(assetsDir, getAndroidAssetDestinationPath(asset, scale));
          mkdirWithAssertPath(to);
          fs.copyFileSync(from, to);
        }),
      ).then(() => void 0);
    }),
  ).then(() => void 0);
}

/**
 * @see https://github.com/facebook/react-native/blob/0.83-stable/packages/community-cli-plugin/src/commands/bundle/getAssetDestPathIOS.js
 */
function getIosAssetDestinationPath(asset: AssetData, scale: AssetScale): string {
  const suffix = scale === 1 ? '' : `@${scale}x`;
  const fileName = `${asset.name + suffix}.${asset.type}`;
  const devServerBasePath =
    asset.httpServerLocation.at(0) === '/'
      ? asset.httpServerLocation.slice(1)
      : asset.httpServerLocation;

  return path.join(devServerBasePath.replace(/\.\.\//g, '_'), fileName);
}

function getAndroidAssetDestinationPath(asset: AssetData, scale: number) {
  const assetQualifierSuffix = ANDROID_ASSET_QUALIFIER[scale];
  const devServerBasePath =
    asset.httpServerLocation.at(0) === '/'
      ? asset.httpServerLocation.slice(1)
      : asset.httpServerLocation;

  const assetName = `${devServerBasePath}/${asset.name}`
    .toLowerCase()
    .replace(/\//g, '_')
    .replace(/(?:[^a-z0-9_])/g, '')
    .replace(/^assets_/, '');

  if (!assetQualifierSuffix) {
    throw new Error(`invalid asset qualifier: ${asset.id}`);
  }

  return path.join(
    isDrawable(asset.type) ? `drawable-${assetQualifierSuffix}` : 'raw',
    `${assetName}.${asset.type}`,
  );
}

/**
 * @see https://developer.android.com/guide/topics/resources/drawable-resource
 */
function isDrawable(type: string) {
  return ['gif', 'heic', 'heif', 'jpeg', 'jpg', 'ktx', 'png', 'webp', 'xml'].includes(type);
}

export function generateAssetRegistryCode(assetRegistryPath: string, asset: AssetData) {
  return `module.exports = require('${assetRegistryPath}').registerAsset(${JSON.stringify(asset)});`;
}
