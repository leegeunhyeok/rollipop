import path from 'node:path';

import type { Command } from '@commander-js/extra-typings';

import type { MaybePromise } from '../types';
import { logger } from './logger';

export function parseBoolean(value: string) {
  return value === 'true' || value === '1';
}

export function resolvePath(value: string) {
  return path.resolve(value);
}

export function withErrorHandler<T = void>(action: (this: Command, args: T) => MaybePromise<void>) {
  return async function (this: Command, args: T) {
    try {
      await action.call(this, args);
    } catch (reason) {
      logger.error('An error occurred while executing the command');
      logger.error(`Reason: ${reason instanceof Error ? reason.message : String(reason)}`);
      logger.debug(reason);
      process.exit(1);
    }
  };
}
