import fp from 'fastify-plugin';

import type { SSEEventBus } from '../sse/event-bus';

export interface SSEPluginOptions {
  eventBus: SSEEventBus;
}

const plugin = fp<SSEPluginOptions>(
  (fastify, { eventBus }) => {
    fastify.get('/sse/events', (request, reply) => {
      const res = reply.raw;
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      });

      // Disable Nagle's algorithm to prevent buffering small writes
      request.raw.socket.setNoDelay(true);

      // Send initial comment to flush headers and confirm connection
      res.write(':ok\n\n');

      eventBus.addClient(res);
      request.raw.on('close', () => eventBus.removeClient(res));
    });
  },
  { name: 'sse' },
);

export { plugin as sse };
