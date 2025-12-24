/**
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/lib/TerminalReporter.js
 * @see https://github.com/facebook/metro/blob/0.81.x/packages/metro/src/lib/reporting.js
 */

import type { FastifyInstance } from 'fastify';
import type * as ws from 'ws';
// Extend Fastify instance type with `@fastify/middie`.
import '@fastify/middie';
import type { ResolvedConfig } from '../config';
import type { WebSocketClient } from './wss/server';

export interface ServerOptions {
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

export interface Middlewares {
  /**
   * Register a middleware to the Fastify instance.
   *
   * **NOTE**: This is a wrapper of `instance.use`.
   */
  use: FastifyInstance['use'];
}

export interface DevServer {
  /**
   * Resolved Rollipop config.
   */
  config: ResolvedConfig;
  /**
   * The Fastify instance.
   */
  instance: FastifyInstance;
  /**
   * `express` and `connect` style middleware registration API.
   */
  middlewares: Middlewares;
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
