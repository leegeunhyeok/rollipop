import { mergeWith } from 'es-toolkit';

import type { DefaultConfig, ResolvedConfig } from './defaults';
import type { Config } from './types';

export function mergeConfig(baseConfig: Config, ...overrideConfigs: Config[]): Config;
export function mergeConfig(
  baseConfig: DefaultConfig,
  ...overrideConfigs: Config[]
): ResolvedConfig;
export function mergeConfig(
  baseConfig: Config | DefaultConfig,
  ...overrideConfigs: Config[]
): Config | ResolvedConfig {
  let mergedConfig = baseConfig;

  for (const overrideConfig of overrideConfigs) {
    mergedConfig = mergeWith(mergedConfig, overrideConfig, (target, source, key) => {
      if (['sourceExtensions', 'assetExtensions', 'polyfills', 'prelude'].includes(key)) {
        return Array.from(new Set([...(target ?? []), ...(source ?? [])]));
      }

      if (key === 'reporter') {
        return source ?? target;
      }
    });
  }

  return mergedConfig;
}
