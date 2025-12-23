/**
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/lib/TerminalReporter.js
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/lib/reporting.js
 */

import type { FastifyInstance } from 'fastify';
import type * as ws from 'ws';

import { WebSocketClient } from './wss/server';

export interface ServerOptions {
  projectRoot: string;
  port?: number;
  host?: string;
  https?: boolean;
  key?: string;
  cert?: string;
  onDeviceConnected?: (client: WebSocketClient) => void;
  onDeviceMessage?: (client: WebSocketClient, data: ws.RawData) => void;
  onDeviceConnectionError?: (client: WebSocketClient, error: Error) => void;
  onDeviceDisconnected?: (client: WebSocketClient) => void;
}

export interface DevServer {
  instance: FastifyInstance;
  message: {
    broadcast: (method: string, params?: Record<string, any>) => void;
  };
  events: {
    reportEvent: (event: any) => void;
  };
}

export interface BundleDetails {
  bundleType: string;
  dev: boolean;
  entryFile: string;
  minify: boolean;
  platform?: string;
}

export interface FormattedError {
  type: string;
  message: string;
  errors: { description: string }[];
}
