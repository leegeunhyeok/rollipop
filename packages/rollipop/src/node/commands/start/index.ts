import { Command } from '@commander-js/extra-typings';
import { noop } from 'es-toolkit';

import * as Rollipop from '../../../index';
import { DEFAULT_HOST, DEFAULT_PORT } from '../../../server/constants';
import { UNSUPPORTED_OPTION_DESCRIPTION } from '../../constants';
import { logger } from '../../logger';
import { withErrorHandler } from '../../utils';
import { setupInteractiveMode } from './setup-interactive-mode';

export const command = new Command('start')
  .description('Start the React Native development server.')
  .option('--config <string>', 'Path to the CLI configuration file')
  .option('--host <string>', 'Host to start the development server on', DEFAULT_HOST)
  .option('--port <number>', 'Port to start the development server on', Number, DEFAULT_PORT)
  .option('--projectRoot <path>', 'Path to a custom project root', '')
  .option('--reset-cache', 'Removes cached files')
  .option('--https', 'Enables https connections to the server')
  .option('--key <path>', 'Path to custom SSL key')
  .option('--cert <path>', 'Path to custom SSL cert')
  .option('--no-interactive', 'Disables interactive mode')
  .option(
    '--client-logs',
    'Enable plain text JavaScript log streaming for all ' +
      'connected apps. This feature is deprecated and will be removed in ' +
      'future.',
    false,
  )
  // Unsupported options
  .option('--watchFolders <list>', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--assetPlugins <list>', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--sourceExts <list>', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--max-workers <list>', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--transformer', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--custom-log-reporter-path', UNSUPPORTED_OPTION_DESCRIPTION)
  .action(
    withErrorHandler(async (options) => {
      const cwd = process.cwd();
      const config = await Rollipop.loadConfig({
        cwd,
        mode: 'development',
        configFile: options.config,
        context: { command: 'start' },
      });

      if (options.resetCache) {
        Rollipop.resetCache(cwd);
        logger.info('The transform cache was reset');
      }

      if (options.clientLogs === false) {
        config.reporter = { update: noop };
      }

      const devServer = await Rollipop.runServer(config, {
        port: options.port,
        host: options.host,
        https: options.https,
        key: options.key,
        cert: options.cert,
      });

      if (options.interactive) {
        setupInteractiveMode({ devServer, extraCommands: config.terminal?.extraCommands });
      }
    }),
  );
