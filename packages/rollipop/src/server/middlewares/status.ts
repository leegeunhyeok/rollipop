import type { Handler } from '@fastify/middie';

import type { BundlerPool } from '../bundler-pool';

export interface StatusMiddlewareOptions {
  bundlerPool: BundlerPool;
}

/**
 * Connect-style middleware mounted at `/status`. Handles `GET /status/:id`
 * by returning the matching bundler's lifecycle state as plain text, and
 * falls through to the next middleware for bare `/status` requests (which
 * `@react-native-community/cli-server-api`'s `statusPageMiddleware` answers
 * with `packager-status:running`).
 *
 * The community middleware is mounted at `/status` with prefix matching,
 * which is why this layer has to run *before* it — otherwise the community
 * handler would end the response on every `/status/*` request and our route
 * would be unreachable.
 */
export function createStatusMiddleware({ bundlerPool }: StatusMiddlewareOptions): Handler {
  return (req, res, next) => {
    // Mounted at `/status`, so `req.url` is the remainder:
    //   "/"          → bare /status — let the next middleware handle it
    //   "/<id>"      → bundler status lookup
    const url = req.url ?? '/';
    if (url === '/' || url === '') {
      return next();
    }

    const id = url.slice(1).split(/[/?#]/, 1)[0];
    if (!id) {
      return next();
    }

    const instance = bundlerPool.getInstanceById(id);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (!instance) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    res.end(instance.status);
  };
}
