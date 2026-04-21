import fp from 'fastify-plugin';
import { asConst, type FromSchema } from 'json-schema-to-ts';

import type { BundlerPool } from '../bundler-pool';

export interface BundlersPluginOptions {
  bundlerPool: BundlerPool;
}

const routeParamSchema = asConst({
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
});

type RouteParams = FromSchema<typeof routeParamSchema>;

const plugin = fp<BundlersPluginOptions>(
  (fastify, { bundlerPool }) => {
    fastify.get<{ Params: RouteParams }>(
      '/bundlers/:id/status',
      { schema: { params: routeParamSchema } },
      (request, reply) => {
        const instance = bundlerPool.getInstanceById(request.params.id);
        if (!instance) {
          return reply.status(404).send({ error: 'not found' });
        }
        // Shape matches the SSE event bus: clients receive the same object
        // here as would arrive live on `/sse/events`. `null` means no build
        // has been observed for this bundler yet (still initializing).
        return reply.send(instance.statusEvent);
      },
    );
  },
  { name: 'bundlers' },
);

export { plugin as bundlers };
