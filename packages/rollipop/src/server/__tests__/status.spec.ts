import type { Mock } from 'vite-plus/test';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { BundlerDevEngine, BundlerPool, BundlerStatus } from '../bundler-pool';
import { createStatusMiddleware } from '../middlewares/status';

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  body: string | null;
  setHeader: Mock;
  end: Mock;
}

function createRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key.toLowerCase()] = value;
    }),
    end: vi.fn((body?: string) => {
      res.body = body ?? null;
    }),
  };
  return res;
}

function createPool(instances: Map<string, { id: string; status: BundlerStatus }>) {
  return {
    getInstanceById(id: string) {
      for (const inst of instances.values()) {
        if (inst.id === id) {
          return inst as unknown as BundlerDevEngine;
        }
      }
      return undefined;
    },
  } as unknown as BundlerPool;
}

describe('status middleware', () => {
  let next: Mock;

  beforeEach(() => {
    next = vi.fn();
  });

  it('calls next() for bare /status (req.url is "/" when mounted at /status)', () => {
    const pool = createPool(new Map());
    const handler = createStatusMiddleware({ bundlerPool: pool });
    const res = createRes();

    handler({ url: '/' } as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('returns the bundler status as plain text for a known id', () => {
    const pool = createPool(new Map([['a', { id: 'bundler-a', status: 'build-done' }]]));
    const handler = createStatusMiddleware({ bundlerPool: pool });
    const res = createRes();

    handler({ url: '/bundler-a' } as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.body).toBe('build-done');
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 with plain text for an unknown id', () => {
    const pool = createPool(new Map());
    const handler = createStatusMiddleware({ bundlerPool: pool });
    const res = createRes();

    handler({ url: '/does-not-exist' } as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe('not found');
  });

  it('ignores query strings when resolving the id', () => {
    const pool = createPool(new Map([['a', { id: 'abc', status: 'building' }]]));
    const handler = createStatusMiddleware({ bundlerPool: pool });
    const res = createRes();

    handler({ url: '/abc?refresh=1' } as any, res as any, next);

    expect(res.body).toBe('building');
  });
});
