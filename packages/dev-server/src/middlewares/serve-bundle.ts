import type { BuildOptions } from '@rollipop/core';
import fp from 'fastify-plugin';
import { asConst, type FromSchema } from 'json-schema-to-ts';

import { bundleRequestSchema, type BundleRequestSchema } from '../common/schema';
import type { BundlerDevEngine } from '../instance-manager';

const routeParamSchema = asConst({
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
  },
});

type RouteParams = FromSchema<typeof routeParamSchema>;

export interface ServeBundlePluginOptions {
  getBundler: (bundleName: string, buildOptions: BuildOptions) => BundlerDevEngine;
}

export const serveBundle = fp<ServeBundlePluginOptions>(
  (fastify, options) => {
    const { getBundler } = options;

    fastify.get<{ Params: RouteParams; Querystring: BundleRequestSchema }>('/:name.bundle', {
      schema: {
        params: routeParamSchema,
        querystring: bundleRequestSchema,
      },
      async handler(request, reply) {
        const { params, query: buildOptions } = request;

        if (!params.name) {
          await reply.status(400).send('invalid bundle name');
          return;
        }

        const bundle = await getBundler(params.name, buildOptions).getBundle();

        await reply
          .header('Content-Type', 'application/javascript')
          .header('Content-Length', Buffer.byteLength(bundle))
          .status(200)
          .send(bundle);
      },
    });

    fastify.get<{ Params: RouteParams; Querystring: BundleRequestSchema }>('/:name.map', {
      schema: {
        params: routeParamSchema,
        querystring: bundleRequestSchema,
      },
      async handler(request, reply) {
        const { params, query: buildOptions } = request;

        if (!params.name) {
          await reply.status(400).send('invalid bundle name');
          return;
        }

        const sourceMap = await getBundler(params.name, buildOptions).getSourceMap();

        await reply
          .header('Access-Control-Allow-Origin', 'devtools://devtools')
          .header('Content-Type', 'application/json')
          .header('Content-Length', Buffer.byteLength(sourceMap))
          .status(200)
          .send(sourceMap);
      },
    });

    
  },
  { name: 'serve-bundle' },
);
