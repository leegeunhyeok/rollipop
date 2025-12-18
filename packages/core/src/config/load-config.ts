import path from 'node:path';

import * as c12 from 'c12';

import { getDefaultConfig } from './defaults';
import { DefineConfigContext } from './define-config';
import { mergeConfig } from './merge-config';
import type { Config } from './types';

const CONFIG_FILE_NAME = 'rollipop';

export interface LoadConfigOptions {
  cwd?: string;
  configFile?: string;
  context?: Omit<DefineConfigContext, 'defaultConfig'>;
}

export async function loadConfig(options: LoadConfigOptions) {
  const { cwd = process.cwd(), configFile, context = {} } = options;

  const defaultConfig = getDefaultConfig(cwd, context);
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
