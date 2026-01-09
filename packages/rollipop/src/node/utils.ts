import type { MaybePromise } from '../types';
import { logger } from './logger';

export function parseBoolean(value: string) {
  return value === 'true' || value === '1';
}

export function withErrorHandler<T = void>(action: (arg: T) => MaybePromise<void>) {
  return async (arg: T) => {
    try {
      await action(arg);
    } catch (reason) {
      logger.error('An error occurred while executing the command');
      logger.error(`Reason: ${reason instanceof Error ? reason.message : String(reason)}`);
      logger.debug(reason);
      process.exit(1);
    }
  };
}
