import type { FileStorage } from '@rollipop/common';
import type { DevOptions } from 'rolldown/experimental';

import type { FileSystemCache } from './cache/file-system-cache';

export interface BuildOptions {
  /**
   * The platform to build for.
   */
  platform: string;
  /**
   * Whether to build in development mode.
   *
   * Defaults to `true`.
   */
  dev?: boolean;
  /**
   * Whether to minify the bundle.
   *
   * Defaults to `false`.
   */
  minify?: boolean;
  /**
   * Enable or disable the cache.
   *
   * Defaults to `true`.
   */
  cache?: boolean;
  /**
   * The output file.
   */
  outfile?: string;
  /**
   * The sourcemap file.
   */
  sourcemap?: string;
  /**
   * The assets directory.
   */
  assetsDir?: string;
}

export type DevEngineOptions = DevOptions & {
  /**
   * The host to run the dev server on.
   */
  host: string;
  /**
   * The port to run the dev server on.
   */
  port: number;
};

export interface BundlerContext {
  id: string;
  cache: FileSystemCache;
  storage: FileStorage;
  mode: BuildMode;
}

export type BuildMode = 'build' | 'serve';

export type AsyncResult<T> = T | Promise<T>;
