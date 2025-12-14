import chalk, { type ChalkInstance } from 'chalk';
import dayjs from 'dayjs';
import { invariant } from 'es-toolkit';

import { isDebugEnabled } from './debug';

export type LogLevel = 'trace' | 'debug' | 'log' | 'info' | 'warn' | 'error';

export class Logger {
  static Colors = {
    trace: chalk.gray,
    debug: chalk.blue,
    log: chalk.green,
    info: chalk.cyan,
    warn: chalk.yellow,
    error: chalk.red,
  } satisfies Record<LogLevel, ChalkInstance>;

  private format: string = 'YYYY-MM-DD HH:mm:ss.SSS';
  private debugEnabled: boolean;

  constructor(private readonly scope?: string) {
    this.debugEnabled = isDebugEnabled();
  }

  getFormat() {
    return this.format;
  }

  setFormat(format: string) {
    this.format = format;
  }

  private getTimestamp() {
    return dayjs().format(this.getFormat());
  }

  private print(logLevel: LogLevel, ...args: unknown[]) {
    const timestamp = chalk.gray(this.getTimestamp());
    const level = Logger.Colors[logLevel](logLevel);

    if (this.scope) {
      const scope = chalk.magenta(this.scope);
      console.log(timestamp, level, scope, ...args);
    } else {
      console.log(timestamp, level, ...args);
    }
  }

  trace(...args: unknown[]) {
    // oxlint-disable-next-line no-unused-expressions
    this.debugEnabled && this.print('trace', ...args);
  }

  debug(...args: unknown[]) {
    // oxlint-disable-next-line no-unused-expressions
    this.debugEnabled && this.print('debug', ...args);
  }

  log(...args: unknown[]) {
    this.print('log', ...args);
  }

  info(...args: unknown[]) {
    this.print('info', ...args);
  }

  warn(...args: unknown[]) {
    this.print('warn', ...args);
  }

  error(...args: unknown[]) {
    this.print('error', ...args);
  }

  child(scope: string) {
    invariant(this.scope, 'Logger must have a scope to create a child logger');
    return new Logger(`${this.scope}:${scope}`);
  }
}

export const logger = new Logger();

export interface LoggerFilterOptions {
  level: LogLevel;
  filter: (args: unknown[]) => unknown[];
}

export function loggerFilter(logger: Logger, options: LoggerFilterOptions): Logger {
  const originalLog = logger[options.level];

  logger[options.level] = (...args: unknown[]) => {
    const filteredArgs = options.filter(args);

    if (filteredArgs.length === 0) {
      return;
    }

    originalLog(...filteredArgs);
  };

  return logger;
}
