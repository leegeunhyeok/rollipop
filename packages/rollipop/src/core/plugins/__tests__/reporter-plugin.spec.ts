import { describe, expect, it } from 'vite-plus/test';

import type { ReportableEvent, Reporter } from '../../../types';
import { reporter } from '../reporter-plugin';

describe('reporter plugin', () => {
  it('counts cache hits as progress and reports final transform/cache counts', async () => {
    const events: ReportableEvent[] = [];
    const plugin = reporter({
      reporter: {
        update(event) {
          events.push(event);
        },
      } satisfies Reporter,
    })!;
    const buildStart = plugin.buildStart as unknown as () => void;
    const buildEnd = plugin.buildEnd as unknown as (error?: Error) => void;
    const transform = plugin.transform as unknown as {
      handler: (code: string, id: string) => void | Promise<void>;
    };
    const transformCacheHit = plugin.transformCacheHit as unknown as (
      id: string,
    ) => void | Promise<void>;

    buildStart();
    await transform.handler('', '/entry.ts');
    await transformCacheHit('/cached.ts');
    buildEnd();

    expect(events).toEqual([
      { type: 'bundle_build_started' },
      {
        type: 'transform',
        id: '/entry.ts',
        totalModules: undefined,
        transformedModules: 1,
      },
      {
        type: 'transform',
        id: '/cached.ts',
        totalModules: undefined,
        transformedModules: 2,
      },
      {
        type: 'bundle_build_done',
        totalModules: 2,
        transformedModules: 1,
        cacheHitModules: 1,
        duration: expect.any(Number),
      },
    ]);
  });

  it('uses the current rebuild total after a watch change', async () => {
    const events: ReportableEvent[] = [];
    const plugin = reporter({
      initialTotalModules: 4722,
      reporter: {
        update(event) {
          events.push(event);
        },
      } satisfies Reporter,
    })!;
    const buildStart = plugin.buildStart as unknown as () => void;
    const buildEnd = plugin.buildEnd as unknown as (error?: Error) => void;
    const transform = plugin.transform as unknown as {
      handler: (code: string, id: string) => void | Promise<void>;
    };
    const watchChange = plugin.watchChange as unknown as (id: string) => void;

    watchChange('/App.tsx');
    buildStart();
    await transform.handler('', '/App.tsx');
    await transform.handler('', '/dep.ts');
    buildEnd();

    expect(events).toEqual([
      { type: 'watch_change', id: '/App.tsx' },
      { type: 'bundle_build_started' },
      {
        type: 'transform',
        id: '/App.tsx',
        totalModules: 1,
        transformedModules: 1,
      },
      {
        type: 'transform',
        id: '/dep.ts',
        totalModules: 2,
        transformedModules: 2,
      },
      {
        type: 'bundle_build_done',
        totalModules: 2,
        transformedModules: 2,
        cacheHitModules: 0,
        duration: expect.any(Number),
      },
    ]);
  });
});
