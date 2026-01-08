import path from 'node:path';

import { merge } from 'es-toolkit';

import type { ResolvedConfig } from '../config';
import type { BuildOptions } from '../core/types';

const DEFAULT_BUILD_OPTIONS = {
  dev: true,
  cache: true,
  minify: false,
} satisfies Partial<BuildOptions>;

export function resolveBuildOptions(config: ResolvedConfig, buildOptions: BuildOptions) {
  if (buildOptions.outfile) {
    buildOptions.outfile = path.resolve(config.root, buildOptions.outfile);
  }

  if (buildOptions.sourcemap) {
    buildOptions.sourcemap = path.resolve(config.root, buildOptions.sourcemap);
  }

  return merge(DEFAULT_BUILD_OPTIONS, { dev: config.mode === 'development', ...buildOptions });
}

export type ResolvedBuildOptions = ReturnType<typeof resolveBuildOptions>;
