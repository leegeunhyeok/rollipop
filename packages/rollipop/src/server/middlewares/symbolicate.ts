import chalk from 'chalk';
import { invariant } from 'es-toolkit';
import fp from 'fastify-plugin';
import { asConst, type FromSchema } from 'json-schema-to-ts';

import { isDebugEnabled } from '../../common/env';
import type { BuildOptions } from '../../core/types';
import { getBaseBundleName } from '../../utils/bundle';
import { parseUrl } from '../../utils/url';
import type { BundlerDevEngine } from '../bundler-pool';
import type { StackFrameInput } from '../symbolicate';
import { symbolicate, type SymbolicateResult } from '../symbolicate';

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

        const { pathname, query } = parseUrl(bundleUrl.file);
        invariant(pathname, 'No pathname found in bundle URL');
        invariant(query.platform, 'No platform found in query');
        invariant(query.dev, 'No dev found in query');

        const bundleName = getBaseBundleName(pathname);
        const bundler = getBundler(bundleName, {
          platform: query.platform as string,
          dev: query.dev === 'true',
        });
        const bundle = await bundler.getBundle();
        const symbolicateResult = await symbolicate(bundle, stack);

        if (isDebugEnabled()) {
          printSymbolicateResult(stack, symbolicateResult);
        }

        await reply.header('Content-Type', 'application/json').send(symbolicateResult);
      },
    });
  },
  { name: 'symbolicate' },
);

function printSymbolicateResult(
  rawStackFrame: StackFrameInput[],
  symbolicateResult: SymbolicateResult,
) {
  console.log();
  console.log('Symbolicate result:');
  console.log();

  if (symbolicateResult.codeFrame != null) {
    console.log(symbolicateResult.codeFrame.content);
    console.log();
  }

  console.log('Stack trace:');
  symbolicateResult.stack.forEach((stackFrame) => {
    const symbol = stackFrame.methodName ?? '<anonymous>';
    const file = stackFrame.file ?? 'unknown';
    const location =
      stackFrame.lineNumber != null && stackFrame.column != null
        ? `(${chalk.gray.underline(`${file}:${stackFrame.lineNumber}:${stackFrame.column}`)})`
        : '';

    console.log(`  at ${symbol} ${location}`);
  });

  console.log();
  console.log('Raw stack trace:');
  rawStackFrame
    .filter((stackFrame) => stackFrame.file?.startsWith('http'))
    .forEach((stackFrame) => {
      const url = new URL(stackFrame.file!);
      const bundleName = url.pathname.slice(1);
      const symbol = stackFrame.methodName ?? '<anonymous>';
      const location =
        stackFrame.lineNumber != null && stackFrame.column != null
          ? `(${chalk.gray.underline(`${bundleName}:${stackFrame.lineNumber}:${stackFrame.column}`)})`
          : '';
      console.log(`  at ${symbol} ${location}`);
    });

  console.log();
}

export { plugin as symbolicate };
