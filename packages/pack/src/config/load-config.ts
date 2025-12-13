import path from 'node:path';

import * as c12 from 'c12';

import { getDefaultConfig } from './defaults';
import { mergeConfig } from './merge-config';
import type { Config } from './types';

const CONFIG_FILE_NAME = 'rollipop';

export interface LoadConfigOptions {
  cwd?: string;
  configFile?: string;
  context?: c12.ConfigFunctionContext;
}

export async function loadConfig(options: LoadConfigOptions) {
  const { cwd = process.cwd(), configFile, context } = options;

  if (context?.defaultConfig != null) {
    throw new Error('`defaultConfig` is reserved key in config context');
  }

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

  return mergeConfig(defaultConfig, userConfig);
}
