import type { DevEngine as BaseDevEngine, DevOptions } from 'rolldown/experimental';

import type { FileSystemCache } from './cache/file-system-cache';
import type { FileStorage } from './fs/storage';

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

export type DevEngine = BaseDevEngine & {
  getContext: () => BundlerContext;
};

export type DevEngineOptions = Omit<DevOptions, 'watch'> & {
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
  buildType: BuildType;
  state: BundlerState;
}

export interface BundlerState {
  hmrUpdates: Set<string>;
}

export type BuildType = 'build' | 'serve';

export type AsyncResult<T> = T | Promise<T>;
