import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { ProgressBarStatusReporter } from '../reporters';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('ProgressBarStatusReporter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders watch rebuild progress using the current build total', async () => {
    const writes: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: Uint8Array | string) => {
      writes.push(String(chunk));
      return true;
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const reporter = new ProgressBarStatusReporter('test-rebuild-progress', '[ios, dev]', 4722);

    try {
      reporter.update({ type: 'watch_change', id: '/App.tsx' });
      reporter.update({ type: 'bundle_build_started' });
      reporter.update({
        type: 'transform',
        id: '/App.tsx',
        totalModules: 1,
        transformedModules: 1,
      });
      await sleep(80);

      const output = writes.join('');
      expect(output).toContain('1/1 modules');
      expect(output).not.toContain('1/4722 modules');
    } finally {
      reporter.update({
        type: 'bundle_build_done',
        totalModules: 1,
        transformedModules: 1,
        cacheHitModules: 0,
        duration: 1,
      });
    }
  });
});
