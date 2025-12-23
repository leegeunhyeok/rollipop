import url from 'url';

import { invariant } from 'es-toolkit';
import fp from 'fastify-plugin';
import { asConst, type FromSchema } from 'json-schema-to-ts';

import type { BuildOptions } from '../../core/types';
import { getBaseBundleName } from '../../utils/bundle';
import type { BundlerDevEngine } from '../bundler-pool';
import type { StackFrameInput } from '../symbolicate';
import { symbolicate } from '../symbolicate';

const bodySchema = asConst({
  type: 'object',
  properties: {
    stack: {
      type: 'array',
      items: {},
    },
    extraData: {},
  },
  required: ['stack'],
});

type Body = FromSchema<typeof bodySchema>;

interface SymbolicateRequestBody {
  stack: StackFrameInput[];
  extraData: Record<string, unknown>;
}

export interface SymbolicatePluginOptions {
  getBundler: (bundleName: string, buildOptions: BuildOptions) => BundlerDevEngine;
}

const plugin = fp<SymbolicatePluginOptions>(
  (fastify, options) => {
    const { getBundler } = options;

    fastify.post<{ Body: Body }>('/symbolicate', {
      schema: {
        body: bodySchema,
      },
      async handler(request, reply) {
        const { stack } = request.body as SymbolicateRequestBody;

        const bundleUrl = stack.find((frame) => frame.file?.startsWith('http'));
        invariant(bundleUrl?.file, 'No bundle URL found in stack frames');

        const { pathname, query } = url.parse(bundleUrl.file, true);
        invariant(pathname, 'No pathname found in bundle URL');
        invariant(query.platform, 'No platform found in query');
        invariant(query.dev, 'No dev found in query');

        const bundleName = getBaseBundleName(pathname);
        const bundler = getBundler(bundleName, {
          platform: query.platform as string,
          dev: query.dev === 'true',
        });
        const bundle = await bundler.getBundle();

        await reply
          .header('Content-Type', 'application/json')
          .send(await symbolicate(bundle, stack));
      },
    });
  },
  { name: 'symbolicate' },
);

export { plugin as symbolicate };
