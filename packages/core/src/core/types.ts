import type { FileStorage } from '@rollipop/common';
import { DevOptions } from 'rolldown/experimental';

import type { FileSystemCache } from './cache/file-system-cache';

export interface BuildOptions {
  platform: string;
  dev?: boolean;
  minify?: boolean;
  cache?: boolean;
  outfile?: string;
  assetsDir?: string;
}

export type DevEngineOptions = DevOptions & {
  host: string;
  port: number;
};

export interface BundlerContext {
  id: string;
  cache: FileSystemCache;
  storage: FileStorage;
  mode: BuildMode;
}

export type BuildMode = 'build' | 'serve';
