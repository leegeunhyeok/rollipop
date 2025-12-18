import type { FileStorage } from '@rollipop/common';

import type { FileSystemCache } from './cache/file-system-cache';

export interface BuildOptions {
  platform: string;
  dev?: boolean;
  minify?: boolean;
  cache?: boolean;
  outfile?: string;
}

export interface BundlerContext {
  id: string;
  cache: FileSystemCache;
  storage: FileStorage;
  mode: BuildMode;
}

export type BuildMode = 'build' | 'serve';
