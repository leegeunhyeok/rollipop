import type * as rolldown from 'rolldown';

import type { Config, ResolvedConfig } from '../../config';
import type { DevServer } from '../../server';

export type PluginConfig = Omit<Config, 'plugins' | 'dangerously_overrideRolldownOptions'>;

export type Plugin = rolldown.Plugin & {
  config?:
    | PluginConfig
    | ((config: PluginConfig) => PluginConfig | null | void)
    | ((config: PluginConfig) => Promise<PluginConfig | null | void>);
  configResolved?: (config: ResolvedConfig) => void | Promise<void>;
  configureServer?: (server: DevServer) => void | Promise<void>;
};
