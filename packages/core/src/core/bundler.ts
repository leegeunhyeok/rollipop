import path from 'node:path';

import { Logo, getCachePath, FileStorage, logger } from '@rollipop/common';
import { invariant, merge } from 'es-toolkit';
import * as rolldown from 'rolldown';
import { dev, DevOptions, type DevEngine } from 'rolldown/experimental';

import type { ResolvedConfig } from '../config/defaults';
import { getId } from '../utils/id';
import { FileSystemCache } from './cache/file-system-cache';
import { getOverrideOptionsForDevServer, resolveRolldownOptions } from './rolldown';
import type { BuildOptions } from './types';

export class Bundler {
  private readonly cache: FileSystemCache;
  private readonly storage: FileStorage;
  private readonly _id: string;
  private _devEngine: DevEngine | null = null;

  static getId(config: ResolvedConfig, buildOptions: BuildOptions) {
    return getId(config, buildOptions);
  }

  constructor(
    private readonly config: ResolvedConfig,
    private readonly buildOptions: BuildOptions,
  ) {
    Logo.printOnce();
    this._id = getId(config, buildOptions);
    this.cache = new FileSystemCache(path.join(getCachePath(this.config.root), this.id));
    this.storage = FileStorage.getInstance(this.config.root);
  }

  get id() {
    return this._id;
  }

  private async resolveOptions(mode: 'build' | 'serve') {
    const { id, cache, storage, config, buildOptions } = this;
    const resolvedOptions = await resolveRolldownOptions(
      { id, cache, storage, mode },
      config,
      buildOptions,
    );

    return resolvedOptions;
  }

  async build() {
    const { input, output } = await this.resolveOptions('build');
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

  async devEngine(devOptions: DevOptions & { host: string; port: number }) {
    if (this._devEngine == null) {
      if (this.buildOptions.dev === false) {
        logger.warn('The dev server only supports dev mode. Overriding config to enable dev mode');
      }

      const { input = {}, output = {} } = await this.resolveOptions('serve');
      const devServerOptions = getOverrideOptionsForDevServer(devOptions);
      const mergedInput = merge(input, devServerOptions.input);
      const mergedOutput = merge(output, devServerOptions.output);

      this._devEngine = await dev(mergedInput, mergedOutput, devOptions);
    }

    return this._devEngine;
  }
}
