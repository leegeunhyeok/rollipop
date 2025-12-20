import path from 'node:path';

import { Logo, getCachePath, FileStorage } from '@rollipop/common';
import { invariant, merge } from 'es-toolkit';
import * as rolldown from 'rolldown';
import { dev } from 'rolldown/experimental';

import type { ResolvedConfig } from '../config/defaults';
import { createId } from '../utils/id';
import { FileSystemCache } from './cache/file-system-cache';
import { getOverrideOptionsForDevServer, resolveRolldownOptions } from './rolldown';
import type { BuildMode, BuildOptions, BundlerContext, DevEngineOptions } from './types';

export class Bundler {
  static async devEngine(
    config: ResolvedConfig,
    buildOptions: Omit<BuildOptions, 'dev' | 'outfile'>,
    devEngineOptions: DevEngineOptions,
  ) {
    const mode = 'serve';
    const resolvedBuildOptions = { ...buildOptions, dev: true };
    const contextBase = Bundler.createContext(mode, config, resolvedBuildOptions);
    const { input = {}, output = {} } = await resolveRolldownOptions(
      { ...contextBase, mode },
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
    buildOptions: BuildOptions,
  ) {
    const id = `${mode}:${Bundler.createId(config, buildOptions)}`;
    const cache = new FileSystemCache(path.join(getCachePath(config.root), id));
    const storage = FileStorage.getInstance(config.root);
    const context: Omit<BundlerContext, 'mode'> = { id, cache, storage };

    return context;
  }

  constructor(private readonly config: ResolvedConfig) {
    Logo.printOnce();
  }

  async build(buildOptions: BuildOptions) {
    const mode = 'build';
    const contextBase = Bundler.createContext(mode, this.config, buildOptions);
    const { config } = this;
    const { input, output } = await resolveRolldownOptions(
      { ...contextBase, mode },
      config,
      buildOptions,
    );

    const rolldownBuildOptions: rolldown.BuildOptions = {
      ...input,
      output,
      write: true,
    };

    const buildResult = await rolldown.build(rolldownBuildOptions);
    const chunk = buildResult.output[0];
    invariant(chunk, 'Bundled chunk is not found');

    return chunk;
  }
}
