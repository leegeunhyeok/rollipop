import * as ws from 'ws';

import { logger as baseLogger } from '../../logger';
import { ReportableEvent } from '../../types';

/**
 * HMR web socket messages
 * @see {@link https://github.com/facebook/metro/blob/v0.81.x/packages/metro-runtime/src/modules/types.flow.js#L68}
 */
export type HmrClientMessage =
  | {
      type: 'register-entrypoints';
      entryPoints: string[];
    }
  | {
      type: 'log';
      level:
        | 'trace'
        | 'info'
        | 'warn'
        | 'error'
        | 'log'
        | 'group'
        | 'groupCollapsed'
        | 'groupEnd'
        | 'debug';
      data: any[];
      mode: 'BRIDGE' | 'NOBRIDGE';
    }
  | {
      type: 'log-opt-in';
    };

export interface HotWebSocketServerOptions {
  reportEvent?: (event: ReportableEvent) => void;
}

function parseHmrClientMessage(data: ws.RawData): HmrClientMessage | null {
  try {
    const parsedData = JSON.parse(String(data));
    return 'type' in parsedData ? (parsedData as HmrClientMessage) : null;
  } catch {
    return null;
  }
}

export function hot(options: HotWebSocketServerOptions) {
  const { reportEvent } = options;
  const logger = baseLogger.child('wss-hot');
  const wss = new ws.WebSocketServer({ noServer: true });

  wss.on('connection', (socket) => {
    logger.trace('connection established');

    socket.on('error', (error) => {
      logger.error('connection error', error);
    });

    socket.on('close', () => {
      logger.trace('connection closed');
    });

    socket.on('message', (data) => {
      const message = parseHmrClientMessage(data);

      if (message == null) {
        return;
      }

      logger.debug('HMR client message received', message);

      if (message.type === 'log') {
        reportEvent?.({
          type: 'client_log',
          level: message.level,
          data: message.data,
        });
      }
    });
  });

  return wss;
}
