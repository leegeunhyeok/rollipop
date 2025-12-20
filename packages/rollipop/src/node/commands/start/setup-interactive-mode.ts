import readline from 'node:readline';
import { ReadStream } from 'node:tty';

import { chalk } from '@rollipop/common';
import { throttle } from 'es-toolkit';

import { DebuggerOpener } from '../../debugger';
import { logger } from '../../logger';

const CTRL_C = '\x03';
const CTRL_D = '\x04';
const BROADCAST_THROTTLE_DELAY = 500;
const SUPPORTED_COMMANDS = {
  r: {
    description: 'Reload app',
    handler: throttle((broadcast) => {
      logger.info('Reloading app...');
      broadcast('reload');
    }, BROADCAST_THROTTLE_DELAY),
  },
  j: {
    description: 'Open DevTools',
  },
  d: {
    description: 'Show developer menu',
    handler: throttle((broadcast) => {
      logger.info('Showing developer menu...');
      broadcast('devMenu');
    }, BROADCAST_THROTTLE_DELAY),
  },
} satisfies Record<string, InteractiveCommand>;

type Broadcast = (message: string, params?: Record<string, any>) => void;

export interface InteractiveCommand {
  description: string;
  handler?: (broadcast: Broadcast) => void;
}

export interface SetupInteractiveModeOptions {
  broadcast: Broadcast;
  debuggerOpener: DebuggerOpener;
}

export function setupInteractiveMode(options: SetupInteractiveModeOptions) {
  const { broadcast, debuggerOpener } = options;

  if (!(process.stdin.isTTY && process.stdin instanceof ReadStream)) {
    logger.warn('Interactive mode is not supported in non-interactive environments');
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (_, key: readline.Key) => {
    const { ctrl, shift } = key;
    const sequence = key.sequence?.toLowerCase();

    if (sequence == null || debuggerOpener.isPrompting()) {
      return;
    }

    if (ctrl && [CTRL_C, CTRL_D].includes(sequence)) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.emit('SIGINT');
      process.exit(0);
    }

    if (shift && sequence.toLowerCase() === 'd') {
      const autoOpenEnabled = debuggerOpener.isAutoOpenEnabled();
      const newAutoOpenEnabled = !autoOpenEnabled;
      debuggerOpener.setAutoOpenEnabled(newAutoOpenEnabled);
      logger.info(
        `Auto opening developer tools: ${chalk.bold(newAutoOpenEnabled ? 'enabled' : 'disabled')}`,
      );
      return;
    }

    switch (sequence) {
      case 'r':
      case 'd':
        SUPPORTED_COMMANDS[sequence].handler(broadcast);
        break;

      case 'j':
        void debuggerOpener.open().catch(() => {
          logger.error('Failed to open debugger');
        });
        break;
    }
  });

  console.log();
  Object.entries(SUPPORTED_COMMANDS).forEach(([key, command]) => {
    const keyLabel = `» Press ${chalk.bold(key)} │`;
    console.log(`${keyLabel} ${command.description}`);
  });

  // Extra
  const keyLabel = `» ${chalk.bold('shift+d')} │`;
  const autoOpenStatus = `(${debuggerOpener.isAutoOpenEnabled() ? 'enabled' : 'disabled'})`;
  console.log(
    `${keyLabel} Toggle auto opening developer tools on startup ${`${chalk.gray.bold(autoOpenStatus)}`}`,
  );
}
