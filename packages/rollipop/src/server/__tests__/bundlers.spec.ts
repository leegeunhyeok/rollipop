import type { Mock } from 'vite-plus/test';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { BundlerDevEngine, BundlerPool, BundlerStatus } from '../bundler-pool';

interface MockRoute {
  method: string;
  path: string;
  handler: (request: unknown, reply: MockReply) => unknown;
}

interface MockReply {
  status: Mock;
  type: Mock;
  send: Mock;
}

function createMockReply(): MockReply {
  const reply: MockReply = {
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

type PluginFn = (
  fastify: unknown,
  options: { bundlerPool: BundlerPool },
  done: () => void,
) => void;

function registerBundlersRoutes(bundlerPool: BundlerPool) {
  const routes: MockRoute[] = [];
  const fastify = {
    get(path: string, _opts: unknown, handler: MockRoute['handler']) {
      routes.push({ method: 'get', path, handler });
    },
  };

  (bundlers as PluginFn)(fastify, { bundlerPool }, () => {});

  return routes;
}

function createPool(instances: Array<{ id: string; status: BundlerStatus }>) {
  return {
    getInstanceById(id: string) {
      return (instances.find((i) => i.id === id) as unknown as BundlerDevEngine) ?? undefined;
    },
  } as unknown as BundlerPool;
}

const { bundlers } = await import('../middlewares/bundlers');

describe('bundlers plugin', () => {
  let pool: BundlerPool;

  beforeEach(() => {
    pool = createPool([{ id: 'abc', status: 'build-done' }]);
  });

  it('registers GET /bundlers/:id/status', () => {
    const routes = registerBundlersRoutes(pool);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ method: 'get', path: '/bundlers/:id/status' });
  });

  it('returns the bundler status as plain text for a known id', async () => {
    const [route] = registerBundlersRoutes(pool);
    const reply = createMockReply();

    await route!.handler({ params: { id: 'abc' } }, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.type).toHaveBeenCalledWith('text/plain');
    expect(reply.send).toHaveBeenCalledWith('build-done');
  });

  it('returns 404 plain text for an unknown id', async () => {
    const [route] = registerBundlersRoutes(pool);
    const reply = createMockReply();

    await route!.handler({ params: { id: 'missing' } }, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.type).toHaveBeenCalledWith('text/plain');
    expect(reply.send).toHaveBeenCalledWith('not found');
  });

  it('reports the current status for each state transition', async () => {
    for (const status of ['idle', 'building', 'build-done', 'build-failed'] as BundlerStatus[]) {
      pool = createPool([{ id: 'abc', status }]);
      const [route] = registerBundlersRoutes(pool);
      const reply = createMockReply();

      await route!.handler({ params: { id: 'abc' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(status);
    }
  });
});
