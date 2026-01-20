import { invariant } from 'es-toolkit';
import type { FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { asConst, type FromSchema } from 'json-schema-to-ts';

import type { BuildOptions } from '../../core/types';
import { BundleResponse } from '../../utils/response';
import type { BundlerDevEngine } from '../bundler-pool';
import { bundleRequestSchema, type BundleRequestSchema } from '../common/schema';

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

function withGetBundleErrorHandler<T>(reply: FastifyReply, task: Promise<T>) {
  return task.catch((error) => {
    return reply.status(500).send(error instanceof Error ? error.message : 'Internal Server Error');
  });
}

const plugin = fp<ServeBundlePluginOptions>(
  (fastify, options) => {
    const { getBundler } = options;

    const getBundleOptions = (buildOptions: BundleRequestSchema) => {
      return {
        platform: buildOptions.platform,
        dev: buildOptions.dev,
        minify: buildOptions.minify,
        sourcemap: buildOptions.inlineSourceMap ? 'inline' : true,
      } as const;
    };

    fastify.get<{ Params: RouteParams; Querystring: BundleRequestSchema }>('/:name.bundle', {
      schema: {
        params: routeParamSchema,
        querystring: bundleRequestSchema,
      },
      async handler(request, reply) {
        const {
          params,
          query,
          headers: { accept },
        } = request;

        if (!params.name) {
          await reply.status(400).send('invalid bundle name');
          return;
        }

        const buildOptions = getBundleOptions(query);
        const bundler = getBundler(params.name, buildOptions);
        const isSupportMultipart = accept?.includes('multipart/mixed') ?? false;

        if (isSupportMultipart) {
          const bundleResponse = new BundleResponse(reply);

          const transformHandler = (_id: string, totalModules = 0, transformedModules: number) => {
            bundleResponse.writeBundleState(transformedModules, totalModules);
          };

          bundler.on('transform', transformHandler);
          await bundler
            .getBundle()
            .then((bundle) => bundleResponse.endWithBundle(bundle.code))
            .catch((error) => bundleResponse.endWithError(error))
            .finally(() => bundler.off('transform', transformHandler));
        } else {
          this.log.debug(`client is not support multipart/mixed content: ${accept ?? '<empty>'}`);
          const bundle = await withGetBundleErrorHandler(reply, bundler.getBundle());
          const code = bundle.code;
          await reply
            .header('Content-Type', 'application/javascript')
            .header('Content-Length', Buffer.byteLength(code))
            .status(200)
            .send(code);
        }
      },
    });

    fastify.get<{ Params: RouteParams; Querystring: BundleRequestSchema }>('/:name.map', {
      schema: {
        params: routeParamSchema,
        querystring: bundleRequestSchema,
      },
      async handler(request, reply) {
        const { params, query } = request;

        if (!params.name) {
          await reply.status(400).send('invalid bundle name');
          return;
        }

        const buildOptions = getBundleOptions(query);
        const bundle = await withGetBundleErrorHandler(
          reply,
          getBundler(params.name, buildOptions).getBundle(),
        );
        const sourceMap = bundle.sourceMap;
        invariant(sourceMap, 'Source map is not available');

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

export { plugin as serveBundle };
