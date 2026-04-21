import fp from 'fastify-plugin';

import { resetCache } from '../../utils/reset-cache';
import type { SSEEventBus } from '../sse/event-bus';

export interface ControlPluginOptions {
  projectRoot: string;
  eventBus: SSEEventBus;
}

const plugin = fp<ControlPluginOptions>(
  (fastify, { projectRoot, eventBus }) => {
    fastify.all('/reset-cache', async (_request, reply) => {
      resetCache(projectRoot);
      eventBus.emit({ type: 'cache_reset' });
      return reply.send({ success: true, message: 'Cache cleared' });
    });
  },
  { name: 'control' },
);

export { plugin as control };
