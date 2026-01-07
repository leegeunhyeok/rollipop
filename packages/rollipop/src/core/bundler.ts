import fs from 'node:fs';
import path from 'node:path';

import { invariant, merge } from 'es-toolkit';
import * as rolldown from 'rolldown';
import { dev } from 'rolldown/experimental';

import { Logo } from '../common/logo';
import type { ResolvedConfig } from '../config/defaults';
import { resolveBuildOptions, ResolvedBuildOptions } from '../utils/build-options';
import { createId } from '../utils/id';
import { FileSystemCache } from './cache/file-system-cache';
import { FileStorage } from './fs/storage';
import { getOverrideOptionsForDevServer, resolveRolldownOptions } from './rolldown';
import type { BuildMode, BuildOptions, BundlerContext, DevEngineOptions } from './types';

export class Bundler {
  static async devEngine(
    config: ResolvedConfig,
    buildOptions: Omit<BuildOptions, 'dev' | 'outfile'>,
    devEngineOptions: DevEngineOptions,
  ) {
    const mode = 'serve';
    const resolvedBuildOptions = resolveBuildOptions(config.root, buildOptions);
    const context = Bundler.createContext(mode, config, resolvedBuildOptions);
    const { input = {}, output = {} } = await resolveRolldownOptions(
      context,
      config,
      resolvedBuildOptions,
    );

    const devServerOptions = getOverrideOptionsForDevServer();
    const mergedInput = merge(input, devServerOptions.input);
    const mergedOutput = merge(output, devServerOptions.output);

    const devEngine = await dev(mergedInput, mergedOutput, devEngineOptions);

    return devEngine;
  }

  static createId(config: ResolvedConfig, buildOptions: BuildOptions) {
    return createId(config, buildOptions);
  }

  private static createContext(
    mode: BuildMode,
    config: ResolvedConfig,
    buildOptions: ResolvedBuildOptions,
  ) {
    const id = Bundler.createId(config, buildOptions);
    const cache = new FileSystemCache(config.root, id);
    const storage = FileStorage.getInstance(config.root);
    const context: BundlerContext = { id, cache, storage, mode };

    return context;
  }

  constructor(private readonly config: ResolvedConfig) {
    Logo.printOnce();
  }

  async build(buildOptions: BuildOptions) {
    const mode = 'build';
    const resolvedBuildOptions = resolveBuildOptions(this.config.root, buildOptions);
    const context = Bundler.createContext(mode, this.config, resolvedBuildOptions);
    const sourcemap = resolvedBuildOptions.sourcemap ? true : false;
    const { input, output } = await resolveRolldownOptions(
      context,
      this.config,
      resolvedBuildOptions,
    );

    const rolldownBuildOptions: rolldown.BuildOptions = {
      ...input,
      output: {
        ...output,
        sourcemap,
      },
      write: Boolean(resolvedBuildOptions.outfile),
    };

    const buildResult = await rolldown.build(rolldownBuildOptions);
    const chunk = buildResult.output[0];
    invariant(chunk, 'Bundled chunk is not found');

    if (resolvedBuildOptions.outfile && chunk.sourcemapFileName && resolvedBuildOptions.sourcemap) {
      const outputDir = path.dirname(resolvedBuildOptions.outfile);
      const sourcemapDir = path.dirname(resolvedBuildOptions.sourcemap);
      const sourcemapFile = path.join(outputDir, chunk.sourcemapFileName);
      if (!fs.existsSync(sourcemapDir)) {
        fs.mkdirSync(sourcemapDir, { recursive: true });
      }
      fs.renameSync(sourcemapFile, resolvedBuildOptions.sourcemap);
    }

    return chunk;
  }
}
