import path from 'node:path';
import * as rolldown from 'rolldown';
import { invariant } from 'es-toolkit';
import { resolveRolldownOptions } from 'src/config/resolve-rolldown-options';
import type { ResolvedConfig } from 'src/config/defaults';
import type { BuildOptions } from './types';
import { toBundleFileName } from 'src/utils/to-bundle-file-name';
import { printLogo } from 'src/common/print-logo';
import { ensureSharedDataPath } from 'src/common/shared-data';
import { FileSystemCache } from './cache/file-system-cache';
import { md5 } from 'src/utils/hash';
import { serialize } from 'src/utils/serialize';

export class Bundler {
  private initialized = false;
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

  async build(buildOptions: BuildOptions) {
    const { config, cache } = this;

    const buildHash = md5(serialize({ config, buildOptions }));
    const bundleFileName = toBundleFileName(config.entry, buildOptions.platform);
    const bundleFileDestination = path.join(buildOptions.outDir ?? 'dist', bundleFileName);
    const context = { buildHash, cache };
    const rolldownOptions = await resolveRolldownOptions(config, context, buildOptions);

    const rolldownBuildOptions: rolldown.BuildOptions = {
      ...rolldownOptions.input,
      output: {
        ...rolldownOptions.output,
        file: bundleFileDestination,
      },
      write: true,
    };

    const buildResult = await rolldown.build(rolldownBuildOptions);
    const chunk = buildResult.output[0];
    invariant(chunk, 'Bundled chunk is not found');

    return chunk;
  }
}
