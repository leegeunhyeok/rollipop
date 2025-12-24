import { chalk, Logger } from '@rollipop/common';
import type { LogLevel, RollupLogWithString } from 'rolldown';

export const pluginLogger = new Logger();

export interface PluginContext {
  debug: (log: RollupLogWithString) => void;
  info: (log: RollupLogWithString) => void;
  warn: (log: RollupLogWithString) => void;
}

export function createPluginContext(name: string | undefined): PluginContext {
  return {
    debug: (log: RollupLogWithString) => {
      printPluginLog('debug', log, name);
    },
    info: (log: RollupLogWithString) => {
      printPluginLog('info', log, name);
    },
    warn: (log: RollupLogWithString) => {
      printPluginLog('warn', log, name);
    },
  };
}

export function printPluginLog(level: LogLevel, log: RollupLogWithString, pluginName = 'unknown') {
  const pluginLabel = chalk.magenta(`plugin:${pluginName}`);
  if (typeof log === 'string') {
    pluginLogger[level](pluginLabel, log);
  } else {
    pluginLogger[level](pluginLabel, log.stack ?? log.message);
  }
}
