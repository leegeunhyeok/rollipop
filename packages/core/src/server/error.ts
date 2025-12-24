import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

import { logger } from './logger';

export function errorHandler(
  this: FastifyInstance,
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  logger.error(
    `An error occurred while processing the request (${request.method} ${request.url}):`,
    error.message,
  );
  logger.debug(error);

  reply.status(500).send('Internal Server Error');
}
