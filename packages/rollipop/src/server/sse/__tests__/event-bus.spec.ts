// oxlint-disable typescript-eslint(unbound-method)
import { type ServerResponse } from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { SSEEventBus } from '../event-bus';
import type { SSEEvent } from '../types';

function createMockResponse(): ServerResponse & { chunks: string[] } {
  const chunks: string[] = [];
  return {
    closed: false,
    write: vi.fn((chunk: string) => {
      chunks.push(chunk);
      return true;
    }),
    chunks,
  } as unknown as ServerResponse & { chunks: string[] };
}

describe('SSEEventBus', () => {
  let bus: SSEEventBus;

  beforeEach(() => {
    bus = new SSEEventBus();
  });

  describe('subscribe / unsubscribe', () => {
    it('should track client count', () => {
      const res = createMockResponse();

      expect(bus.clientCount).toBe(0);
      bus.subscribe(res);
      expect(bus.clientCount).toBe(1);
      bus.unsubscribe(res);
      expect(bus.clientCount).toBe(0);
    });
  });

  describe('emit', () => {
    it('should send SSE-formatted message to all subscribed clients', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      bus.subscribe(res1);
      bus.subscribe(res2);

      const event: SSEEvent = { type: 'server_ready', host: 'localhost', port: 8081 };
      bus.emit(event);

      const expected = `event: server_ready\ndata: ${JSON.stringify(event)}\n\n`;
      expect(res1.write).toHaveBeenCalledWith(expected);
      expect(res2.write).toHaveBeenCalledWith(expected);
    });

    it('should not send to unsubscribed clients', () => {
      const res = createMockResponse();
      bus.subscribe(res);
      bus.unsubscribe(res);

      bus.emit({ type: 'bundle_build_started', id: 'ios-true' });

      expect(res.write).not.toHaveBeenCalled();
    });

    it('should skip closed connections', () => {
      const res = createMockResponse();
      bus.subscribe(res);
      (res as unknown as { closed: boolean }).closed = true;

      bus.emit({ type: 'bundle_build_started', id: 'ios-true' });

      expect(res.write).not.toHaveBeenCalled();
    });

    it('should format different event types correctly', () => {
      const res = createMockResponse();
      bus.subscribe(res);

      bus.emit({ type: 'bundle_build_done', id: 'ios-true', totalModules: 42, duration: 1500 });
      bus.emit({ type: 'watch_change', id: 'ios-true', file: 'src/App.tsx' });

      expect(res.chunks).toHaveLength(2);
      expect(res.chunks[0]).toContain('event: bundle_build_done');
      expect(res.chunks[0]).toContain('"totalModules":42');
      expect(res.chunks[1]).toContain('event: watch_change');
      expect(res.chunks[1]).toContain('"file":"src/App.tsx"');
    });
  });
});
