import type { ServerResponse } from 'node:http';

import type { SSEEvent } from './types';

export class SSEEventBus {
  private clients: Set<ServerResponse> = new Set();

  emit(event: SSEEvent): void {
    const data = JSON.stringify(event);
    const message = `event: ${event.type}\ndata: ${data}\n\n`;
    for (const client of this.clients) {
      if (!client.closed) {
        client.write(message);
      }
    }
  }

  subscribe(res: ServerResponse): void {
    this.clients.add(res);
  }

  unsubscribe(res: ServerResponse): void {
    this.clients.delete(res);
  }

  get clientCount(): number {
    return this.clients.size;
  }
}
