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

  describe('addClient / removeClient', () => {
    it('should track client count', () => {
      const res = createMockResponse();

      expect(bus.clientCount).toBe(0);
      bus.addClient(res);
      expect(bus.clientCount).toBe(1);
      bus.removeClient(res);
      expect(bus.clientCount).toBe(0);
    });
  });

  describe('emit', () => {
    it('should send SSE-formatted message to all subscribed clients', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      bus.addClient(res1);
      bus.addClient(res2);

      const event: SSEEvent = { type: 'server_ready', host: 'localhost', port: 8081 };
      bus.emit(event);

      const expected = `event: server_ready\ndata: ${JSON.stringify(event)}\n\n`;
      expect(res1.write).toHaveBeenCalledWith(expected);
      expect(res2.write).toHaveBeenCalledWith(expected);
    });

    it('should not send to removed clients', () => {
      const res = createMockResponse();
      bus.addClient(res);
      bus.removeClient(res);

      bus.emit({ type: 'bundle_build_started', id: 'ios-true' });

      expect(res.write).not.toHaveBeenCalled();
    });

    it('should skip closed connections', () => {
      const res = createMockResponse();
      bus.addClient(res);
      (res as unknown as { closed: boolean }).closed = true;

      bus.emit({ type: 'bundle_build_started', id: 'ios-true' });

      expect(res.write).not.toHaveBeenCalled();
    });

    it('should format different event types correctly', () => {
      const res = createMockResponse();
      bus.addClient(res);

      bus.emit({ type: 'bundle_build_done', id: 'ios-true', totalModules: 42, duration: 1500 });
      bus.emit({ type: 'watch_change', id: 'ios-true', file: 'src/App.tsx' });

      expect(res.chunks).toHaveLength(2);
      expect(res.chunks[0]).toContain('event: bundle_build_done');
      expect(res.chunks[0]).toContain('"totalModules":42');
      expect(res.chunks[1]).toContain('event: watch_change');
      expect(res.chunks[1]).toContain('"file":"src/App.tsx"');
    });

    it('should notify listeners registered via collect', () => {
      const events: SSEEvent[] = [];
      bus.collect(events);

      bus.emit({ type: 'bundle_build_started', id: 'ios-true' });
      bus.emit({ type: 'bundle_build_done', id: 'ios-true', totalModules: 10, duration: 100 });

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('bundle_build_started');
      expect(events[1].type).toBe('bundle_build_done');
    });

    it('should stop collecting after unsubscribe', () => {
      const events: SSEEvent[] = [];
      const unsubscribe = bus.collect(events);

      bus.emit({ type: 'bundle_build_started', id: 'ios-true' });
      unsubscribe();
      bus.emit({ type: 'bundle_build_done', id: 'ios-true', totalModules: 10, duration: 100 });

      expect(events).toHaveLength(1);
    });
  });
});
