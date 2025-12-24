import EventEmitter from 'node:events';
import { IncomingMessage } from 'node:http';
import { Duplex } from 'node:stream';
import url from 'url';

import { Logger } from '@rollipop/common';
import * as ws from 'ws';

import { logger as devServerLogger } from '../logger';

export type BufferLike = Parameters<ws.WebSocket['send']>[0];

export type WebSocketClient = ws.WebSocket & {
  id: number;
};

export interface WebSocketEventMap {
  connection: [WebSocketClient];
  message: [WebSocketClient, ws.RawData];
  error: [WebSocketClient, Error];
  close: [WebSocketClient];
}

export abstract class WebSocketServer extends EventEmitter {
  protected clientId = 0;
  protected wss: ws.WebSocketServer;
  protected logger: Logger;

  constructor(name: string, options?: ws.ServerOptions) {
    super();
    const logger = devServerLogger.child(name);
    const wss = new ws.WebSocketServer(options);

    wss.on('connection', (socket) => {
      const client = Object.defineProperty(socket, 'id', {
        value: this.clientId++,
        writable: false,
      });

      this.onConnection(client);
      this.emit('connection', client);

      client.on('message', (data) => {
        this.onMessage(client, data);
        this.emit('message', client, data);
      });

      client.on('error', (error) => {
        this.onError(client, error);
        this.emit('error', client, error);
      });

      client.on('close', () => {
        this.onClose(client);
        this.emit('close', client);
      });
    });

    this.wss = wss;
    this.logger = logger;
  }

  get server() {
    return this.wss;
  }

  protected send(client: ws.WebSocket, data: BufferLike) {
    if (client.readyState === ws.WebSocket.OPEN) {
      client.send(data);
    }
  }

  protected sendAll(data: BufferLike) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === ws.WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  protected rawDataToString(data: ws.RawData) {
    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }

    if (Array.isArray(data)) {
      return Buffer.concat(data).toString('utf8');
    }

    return Buffer.from(data).toString('utf8');
  }

  protected abstract onConnection(socket: ws.WebSocket): void;
  protected abstract onMessage(socket: ws.WebSocket, data: ws.RawData): void;
  protected abstract onError(socket: ws.WebSocket, error: Error): void;
  protected abstract onClose(socket: ws.WebSocket): void;
}

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
        wss.emit('connection', socket, request);
      });
    } else {
      socket.destroy();
    }
  };
}
