import type { Mock } from 'vite-plus/test';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { BundlerDevEngine, BundlerPool, BundlerStatusEvent } from '../bundler-pool';

interface MockRoute {
  method: string;
  path: string;
  handler: (request: unknown, reply: MockReply) => unknown;
}

interface MockReply {
  status: Mock;
  send: Mock;
}

function createMockReply(): MockReply {
  const reply: MockReply = {
    status: vi.fn().mockReturnThis(),
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

function createPool(instances: Array<{ id: string; statusEvent: BundlerStatusEvent | null }>) {
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
    pool = createPool([
      {
        id: 'abc',
        statusEvent: {
          type: 'bundle_build_done',
          id: 'abc',
          totalModules: 42,
          duration: 1200,
        },
      },
    ]);
  });

  it('registers GET /bundlers/:id/status', () => {
    const routes = registerBundlersRoutes(pool);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ method: 'get', path: '/bundlers/:id/status' });
  });

  it('returns the latest statusEvent as JSON for a known id', async () => {
    const [route] = registerBundlersRoutes(pool);
    const reply = createMockReply();

    await route!.handler({ params: { id: 'abc' } }, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith({
      type: 'bundle_build_done',
      id: 'abc',
      totalModules: 42,
      duration: 1200,
    });
  });

  it('returns null when the bundler has not observed any build yet', async () => {
    pool = createPool([{ id: 'abc', statusEvent: null }]);
    const [route] = registerBundlersRoutes(pool);
    const reply = createMockReply();

    await route!.handler({ params: { id: 'abc' } }, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith(null);
  });

  it('returns 404 { error: "not found" } for an unknown id', async () => {
    const [route] = registerBundlersRoutes(pool);
    const reply = createMockReply();

    await route!.handler({ params: { id: 'missing' } }, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'not found' });
  });

  it('mirrors every build-lifecycle SSE event shape', async () => {
    const cases: BundlerStatusEvent[] = [
      { type: 'bundle_build_started', id: 'abc' },
      { type: 'bundle_build_done', id: 'abc', totalModules: 10, duration: 500 },
      { type: 'bundle_build_failed', id: 'abc', error: 'boom' },
    ];

    for (const statusEvent of cases) {
      pool = createPool([{ id: 'abc', statusEvent }]);
      const [route] = registerBundlersRoutes(pool);
      const reply = createMockReply();

      await route!.handler({ params: { id: 'abc' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(statusEvent);
    }
  });
});
