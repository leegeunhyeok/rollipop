import { IncomingMessage } from 'node:http';
import { Duplex } from 'node:stream';
import url from 'url';

import { logger } from '@rollipop/common';
import * as ws from 'ws';

export function getWebSocketUpgradeHandler(websocketEndpoints: Record<string, ws.WebSocketServer>) {
  return (request: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>) => {
    if (request.url == null) {
      socket.destroy();
      return;
    }

    const { pathname } = url.parse(request.url, true);
    if (pathname != null && websocketEndpoints[pathname]) {
      const wss = websocketEndpoints[pathname];
      wss.handleUpgrade(request, socket, head, (socket) => {
        logger.trace('WebSocket upgraded', { pathname });
        wss.emit('connection', socket, request);
      });
    } else {
      socket.destroy();
    }
  };
}
