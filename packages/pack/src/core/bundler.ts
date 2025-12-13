import path from 'node:path';

import { invariant, pick } from 'es-toolkit';
import * as rolldown from 'rolldown';

import { printLogo } from '../common/print-logo';
import { ensureSharedDataPath } from '../common/shared-data';
import type { ResolvedConfig } from '../config/defaults';
import { md5 } from '../utils/hash';
import { serialize } from '../utils/serialize';
import { FileSystemCache } from './cache/file-system-cache';
import { resolveRolldownOptions } from './rolldown';
import type { BuildOptions } from './types';

export class Bundler {
  private readonly sharedDataPath: string;
  private readonly cachePath: string;
  private readonly cache: FileSystemCache;

  /**
   * @TODO
   */
  static createServer(bundler: Bundler) {}

  constructor(private readonly config: ResolvedConfig) {
    printLogo();
    this.sharedDataPath = ensureSharedDataPath(this.config.root);
    this.cachePath = path.join(this.sharedDataPath, 'cache');
    this.cache = new FileSystemCache(this.cachePath);
  }

  private extractBundleRelevantOptions(config: ResolvedConfig, buildOptions: BuildOptions) {
    return {
      config: pick(config, ['resolver', 'transformer', 'serializer', 'plugins']),
      buildOptions: pick(buildOptions, ['platform', 'dev']),
    };
  }

  async build(buildOptions: BuildOptions) {
    const { config, cache } = this;

    const buildHash = md5(serialize(this.extractBundleRelevantOptions(config, buildOptions)));
    const context = { buildHash, cache };
    const rolldownOptions = await resolveRolldownOptions(config, context, buildOptions);
    const rolldownBuildOptions: rolldown.BuildOptions = {
      ...rolldownOptions.input,
      output: {
        ...rolldownOptions.output,
        file: buildOptions.outfile,
      },
      write: true,
    };

    const buildResult = await rolldown.build(rolldownBuildOptions);
    const chunk = buildResult.output[0];
    invariant(chunk, 'Bundled chunk is not found');

    return chunk;
  }

  resetCache() {
    this.cache.clear();
  }
}
