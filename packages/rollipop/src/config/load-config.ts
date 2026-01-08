import path from 'node:path';

import * as c12 from 'c12';
import { omit } from 'es-toolkit';

import { createPluginContext } from '../core/plugins/context';
import type { Plugin, PluginConfig } from '../core/plugins/types';
import { getDefaultConfig, type ResolvedConfig } from './defaults';
import { DefineConfigContext } from './define-config';
import { mergeConfig, type PluginFlattenConfig } from './merge-config';
import type { Config, PluginOption } from './types';

const CONFIG_FILE_NAME = 'rollipop';

export interface LoadConfigOptions {
  cwd?: string;
  configFile?: string;
  mode?: Config['mode'];
  context?: Omit<DefineConfigContext, 'defaultConfig'>;
}

export async function loadConfig(options: LoadConfigOptions = {}) {
  const { cwd = process.cwd(), configFile, mode, context = {} } = options;

  const defaultConfig = getDefaultConfig(cwd, mode);
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

  const plugins = await flattenPluginOption(userConfig.plugins);
  const pluginConfig = await resolvePluginConfig(userConfig, plugins);
  const overrideConfigs: PluginFlattenConfig[] = [{ ...userConfig, plugins }, pluginConfig];
  const resolvedConfig = mergeConfig(defaultConfig, ...overrideConfigs);

  await invokeConfigResolved(resolvedConfig, plugins);

  return resolvedConfig;
}

export async function flattenPluginOption(pluginOption: PluginOption): Promise<Plugin[]> {
  const awaitedPluginOption = await pluginOption;

  if (Array.isArray(awaitedPluginOption)) {
    const plugins = await Promise.all(awaitedPluginOption.map(flattenPluginOption));
    return plugins.flat();
  }

  if (awaitedPluginOption == null || awaitedPluginOption === false) {
    return [];
  }

  return [awaitedPluginOption];
}

export async function resolvePluginConfig(baseConfig: Config, plugins: Plugin[]) {
  let mergedConfig: PluginConfig = omit(baseConfig, [
    'plugins',
    'dangerously_overrideRolldownOptions',
  ]);

  for (const plugin of plugins) {
    const context = createPluginContext(plugin.name);

    if (typeof plugin.config === 'function') {
      const config = await plugin.config.call(context, mergedConfig);
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
  await Promise.all(
    plugins.map((plugin) => {
      const context = createPluginContext(plugin.name);
      return plugin.configResolved?.call(context, config);
    }),
  );
}
