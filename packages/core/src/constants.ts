/**
 * @see `tsdown.config.ts`
 */
declare global {
  var __ROLLIPOP_VERSION__: string;
}

export const ROLLIPOP_VERSION = globalThis.__ROLLIPOP_VERSION__;

export const GLOBAL_IDENTIFIER = '__ROLLIPOP_GLOBAL__';

/**
 * Unlike the Metro bundler configuration, this prioritizes resolving module(ESM) fields first.
 *
 * @see {@link https://github.com/facebook/metro/blob/0.81.x/docs/Configuration.md#resolvermainfields}
 */
export const DEFAULT_RESOLVER_MAIN_FIELDS = ['react-native', 'module', 'main'];
export const DEFAULT_RESOLVER_CONDITION_NAMES = ['react-native', 'import', 'require'];

/**
 * Unlike the Metro bundler configuration, this prioritizes resolving TypeScript and ESM first.
 *
 * @see {@link https://github.com/facebook/metro/blob/0.81.x/packages/metro-config/src/defaults/defaults.js}
 * @see {@link https://github.com/facebook/metro/blob/0.81.x/packages/metro-file-map/src/workerExclusionList.js}
 */
export const DEFAULT_SOURCE_EXTENSIONS = [
  'ts',
  'tsx',
  'js',
  'jsx',
  // Additional module formats
  'mjs',
  'cjs',
  // JSON files
  'json',
];

export const DEFAULT_ASSET_EXTENSIONS = [
  // Image formats
  'bmp',
  'gif',
  'jpg',
  'jpeg',
  'png',
  'psd',
  'svg',
  'webp',
  'xml',
  // Video formats
  'm4v',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'webm',
  // Audio formats
  'aac',
  'aiff',
  'caf',
  'm4a',
  'mp3',
  'wav',
  // Document formats
  'html',
  'pdf',
  'yaml',
  'yml',
  // Font formats
  'otf',
  'ttf',
  // Archives (virtual files)
  'zip',
];

export const DEFAULT_ASSET_REGISTRY_PATH = 'react-native/Libraries/Image/AssetRegistry.js';
export const DEFAULT_HMR_CLIENT_PATH = 'react-native/Libraries/Utilities/HMRClient.js';
