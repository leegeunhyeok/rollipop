import { chalk, Logger } from '@rollipop/common';
import type { FastifyBaseLogger } from 'fastify';

export const logger = new Logger('dev-server');

export class DevServerLogger implements FastifyBaseLogger {
  level: string = 'trace';

  trace(...args: unknown[]) {
    logger.trace(...args);
  }

  debug(...args: unknown[]) {
    logger.debug(...args);
  }

  info(...args: unknown[]) {
    logger.info(...args);
  }

  warn(...args: unknown[]) {
    logger.warn(...args);
  }

  error(...args: unknown[]) {
    logger.error(...args);
  }

  silent(...args: unknown[]) {
    logger.trace(chalk.gray('(silent)'), ...args);
  }

  fatal(...args: unknown[]) {
    logger.error(chalk.magenta('(fatal)'), ...args);
  }

  child(_bindings: object): FastifyBaseLogger {
    return this;
  }
}
