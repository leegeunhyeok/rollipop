import type { FileSystemCache } from './cache/file-system-cache';

export interface BuildOptions {
  platform: string;
  dev?: boolean;
  cache?: boolean;
  outDir?: string;
}

export interface BundlerContext {
  cache: FileSystemCache;
  buildHash: string;
}
