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
  reporter?: Reporter;
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

type HealthCheckResult = any;
type WatcherStatus = any;

export interface BundleDetails {
  bundleType: string;
  dev: boolean;
  entryFile: string;
  minify: boolean;
  platform?: string;
}

export type ReportableEvent =
  | {
      port: number;
      hasReducedPerformance: boolean;
      type: 'initialize_started';
    }
  | {
      type: 'initialize_failed';
      port: number;
      error: Error;
    }
  | {
      type: 'initialize_done';
      port: number;
    }
  | {
      buildID: string;
      type: 'bundle_build_done';
    }
  | {
      buildID: string;
      type: 'bundle_build_failed';
    }
  | {
      type: 'bundle_save_log';
      message: string;
    }
  | {
      buildID: string;
      bundleDetails: BundleDetails;
      isPrefetch?: boolean;
      type: 'bundle_build_started';
    }
  | {
      error: Error;
      type: 'bundling_error';
    }
  | {
      type: 'dep_graph_loading';
      hasReducedPerformance: boolean;
    }
  | { type: 'dep_graph_loaded' }
  | {
      buildID: string;
      type: 'bundle_transform_progressed';
      transformedFileCount: number;
      totalFileCount: number;
    }
  | {
      type: 'cache_read_error';
      error: Error;
    }
  | {
      type: 'cache_write_error';
      error: Error;
    }
  | { type: 'transform_cache_reset' }
  | {
      type: 'worker_stdout_chunk';
      chunk: string;
    }
  | {
      type: 'worker_stderr_chunk';
      chunk: string;
    }
  | {
      type: 'hmr_client_error';
      error: Error;
    }
  | {
      type: 'client_log';
      level:
        | 'trace'
        | 'info'
        | 'warn'
        | 'log'
        | 'group'
        | 'groupCollapsed'
        | 'groupEnd'
        | 'debug'
        /**
         * In react-native, ReportableEvent['level'] does not defined `error` type.
         * But, Flipper supports the `error` type.
         *
         * @see https://github.com/facebook/flipper/blob/v0.273.0/desktop/flipper-common/src/server-types.tsx#L74
         */
        | 'error';
      data: any[];
    }
  | {
      type: 'resolver_warning';
      message: string;
    }
  | {
      type: 'server_listening';
      port: number;
      address: string;
      family: string;
    }
  | {
      type: 'transformer_load_started';
    }
  | {
      type: 'transformer_load_done';
    }
  | {
      type: 'transformer_load_failed';
      error: Error;
    }
  | {
      type: 'watcher_health_check_result';
      result: HealthCheckResult;
    }
  | {
      type: 'watcher_status';
      status: WatcherStatus;
    };

export type TerminalReportableEvent =
  | ReportableEvent
  | {
      buildID: string;
      type: 'bundle_transform_progressed_throttled';
      transformedFileCount: number;
      totalFileCount: number;
    }
  | {
      type: 'unstable_server_log';
      level: 'info' | 'warn' | 'error';
      data: string | any[];
    }
  | {
      type: 'unstable_server_menu_updated';
      message: string;
    }
  | {
      type: 'unstable_server_menu_cleared';
    };

export interface FormattedError {
  type: string;
  message: string;
  errors: { description: string }[];
}

export interface Reporter {
  update(event: ReportableEvent): void;
}
