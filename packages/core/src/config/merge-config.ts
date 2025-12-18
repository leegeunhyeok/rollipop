import { merge } from 'es-toolkit';

import type { DefaultConfig, ResolvedConfig } from './defaults';
import type { Config } from './types';

export function mergeConfig(baseConfig: DefaultConfig, overrideConfig: Config): ResolvedConfig {
  return merge(baseConfig, overrideConfig);
}
