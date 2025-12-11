/**
 * @see {@link https://github.com/facebook/metro/blob/0.81.x/docs/Configuration.md#resolvermainfields}
 */
export const RESOLVER_MAIN_FIELDS = ['react-native', 'module', 'main'];

/**
 * @see {@link https://github.com/facebook/metro/blob/0.81.x/packages/metro-config/src/defaults/defaults.js}
 * @see {@link https://github.com/facebook/metro/blob/0.81.x/packages/metro-file-map/src/workerExclusionList.js}
 */
export const SOURCE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js', 'mjs', 'cjs', 'json'];

export const ASSET_EXTENSIONS = [
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
