import type { NextHandleFunction } from '@fastify/middie';
import chalk from 'chalk';
import type { FastifyRequest } from 'fastify';

import { isDebugEnabled } from '../../common/debug';
import { logger } from '../logger';

const requestLogger: NextHandleFunction = (req: FastifyRequest, _res, next) => {
  if (isDebugEnabled()) {
    logger.trace(chalk.bgBlue(` ${req.method} `), chalk.gray(req.url));
    Object.entries(req.headers).forEach(([key, value]) => {
      logger.trace(`${chalk.bold(key)}: ${chalk.gray(value)}`);
    });
  }
  next();
};

export { requestLogger };
