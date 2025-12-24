import path from 'node:path';

import * as c12 from 'c12';
import { omit } from 'es-toolkit';

import type { Plugin } from '../core/plugins/types';
import { getDefaultConfig, ResolvedConfig } from './defaults';
import { DefineConfigContext } from './define-config';
import { mergeConfig } from './merge-config';
import type { Config } from './types';

const CONFIG_FILE_NAME = 'rollipop';

export interface LoadConfigOptions {
  cwd?: string;
  configFile?: string;
  context?: Omit<DefineConfigContext, 'defaultConfig'>;
}

export async function loadConfig(options: LoadConfigOptions = {}) {
  const { cwd = process.cwd(), configFile, context = {} } = options;

  const defaultConfig = getDefaultConfig(cwd);
  const commonOptions: c12.LoadConfigOptions = {
    context: { ...context, defaultConfig },
    rcFile: false,
  };

  const { config: userConfig } = await c12.loadConfig<Config>(
    configFile
      ? { configFile: path.resolve(cwd, configFile), configFileRequired: true }
      : {
          cwd,
          defaultConfig,
          name: CONFIG_FILE_NAME,
          ...commonOptions,
        },
  );

  const pluginConfig = await resolvePluginConfig(userConfig, userConfig.plugins ?? []);
  const resolvedConfig = mergeConfig(defaultConfig, userConfig, pluginConfig);

  await invokeConfigResolved(resolvedConfig, userConfig.plugins ?? []);

  return resolvedConfig;
}

export async function resolvePluginConfig(baseConfig: Config, plugins: Plugin[]) {
  let mergedConfig: Config = omit(baseConfig, ['plugins', 'dangerously_overrideRolldownOptions']);

  for (const plugin of plugins) {
    if (typeof plugin.config === 'function') {
      const config = await plugin.config(mergedConfig);
      if (config != null) {
        mergedConfig = mergeConfig(mergedConfig, config);
      }
    } else if (typeof plugin.config === 'object') {
      mergedConfig = mergeConfig(mergedConfig, plugin.config);
    }
  }

  return mergedConfig;
}

export async function invokeConfigResolved(config: ResolvedConfig, plugins: Plugin[]) {
  for (const plugin of plugins) {
    await plugin.configResolved?.(config);
  }
}
