import { Bundler, type ResolvedConfig, type BuildOptions, type rolldown } from '@rollipop/core';

export async function runBuild(
  config: ResolvedConfig,
  options: BuildOptions,
): Promise<rolldown.OutputChunk> {
  const bundler = new Bundler(config, options);

  return await bundler.build();
}
