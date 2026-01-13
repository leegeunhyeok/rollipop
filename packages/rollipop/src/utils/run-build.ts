import type * as rolldown from '@rollipop/rolldown';

import type { ResolvedConfig } from '../config';
import { Bundler } from '../core/bundler';
import type { BuildOptions } from '../core/types';

export async function runBuild(
  config: ResolvedConfig,
  options: BuildOptions,
): Promise<rolldown.OutputChunk> {
  const bundler = new Bundler(config);

  return await bundler.build(options);
}
