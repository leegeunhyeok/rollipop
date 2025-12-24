/**
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/lib/TerminalReporter.js
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/lib/reporting.js
 */

import type { FastifyInstance } from 'fastify';
import type * as ws from 'ws';

import type { ResolvedConfig } from '../config';
import type { WebSocketClient } from './wss/server';

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
  /**
   * The Fastify instance.
   */
  instance: FastifyInstance;
  /**
   * Resolved Rollipop config.
   */
  config: ResolvedConfig;
  /**
   * The message websocket API.
   */
  message: {
    /**
     * Broadcast a message to all connected devices.
     */
    broadcast: (method: string, params?: Record<string, any>) => void;
  };
  /**
   * The events websocket API.
   */
  events: {
    /**
     * Report an event to the reporter.
     */
    reportEvent: (event: { type: string; [key: string]: unknown }) => void;
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
