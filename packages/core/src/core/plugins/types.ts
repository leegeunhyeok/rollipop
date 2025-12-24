import type * as rolldown from 'rolldown';

import type { Config, ResolvedConfig } from '../../config';
import type { DevServer } from '../../server';
import type { AsyncResult } from '../types';

export type PluginConfig = Omit<Config, 'plugins' | 'dangerously_overrideRolldownOptions'>;

export type Plugin = rolldown.Plugin & {
  config?: PluginConfig | ((config: PluginConfig) => AsyncResult<PluginConfig | null | void>);
  configResolved?: (config: ResolvedConfig) => AsyncResult<void>;
  configureServer?: (server: DevServer) => AsyncResult<void | (() => AsyncResult<void>)>;
};
