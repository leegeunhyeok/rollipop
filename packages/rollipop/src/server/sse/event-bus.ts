import type { ServerResponse } from 'node:http';

import type { SSEEvent } from './types';

type EventListener = (event: SSEEvent) => void;

export class SSEEventBus {
  private clients: Set<ServerResponse> = new Set();
  private listeners: Set<EventListener> = new Set();

  emit(event: SSEEvent): void {
    const data = JSON.stringify(event);
    const message = `event: ${event.type}\ndata: ${data}\n\n`;
    for (const client of this.clients) {
      if (!client.closed) {
        client.write(message);
      }
    }
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Subscribe an SSE HTTP response client.
   */
  addClient(res: ServerResponse): void {
    this.clients.add(res);
  }

  /**
   * Unsubscribe an SSE HTTP response client.
   */
  removeClient(res: ServerResponse): void {
    this.clients.delete(res);
  }

  /**
   * Subscribe a listener that collects events into the given array.
   * Returns an unsubscribe function.
   */
  collect(collector: SSEEvent[]): () => void {
    const listener: EventListener = (event) => collector.push(event);
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get clientCount(): number {
    return this.clients.size;
  }
}
