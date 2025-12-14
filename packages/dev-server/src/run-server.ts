import url from 'url';

import { createDevServerMiddleware } from '@react-native-community/cli-server-api';
import { createDevMiddleware } from '@react-native/dev-middleware';
import type { ResolvedConfig } from '@rollipop/pack';
import Fastify from 'fastify';

import { InstanceManager } from './bundler';
import { DEFAULT_HOST, DEFAULT_PORT } from './constants';
import { errorHandler } from './error';
import { DevServerLogger, logger } from './logger';
import { serveAssets } from './middlewares/serve-assets';
import { serveBundle, type ServeBundlePluginOptions } from './middlewares/serve-bundle';
import { symbolicate } from './middlewares/symbolicate';
import { hot } from './middlewares/wss/hot';
import type { DevServer, ServerOptions } from './types';
import { isDevServerRunning } from './utils/is-dev-server-running';
import { getWebSocketUpgradeHandler } from './utils/wss';

export async function runServer(
  config: ResolvedConfig,
  options: ServerOptions,
): Promise<DevServer> {
  const {
    projectRoot,
    port = DEFAULT_PORT,
    host = DEFAULT_HOST,
    https = false,
    reporter,
  } = options;

  if (https) {
    throw new Error('HTTPS is not supported yet');
  }

  const serverBaseUrl = url.format({ protocol: https ? 'https' : 'http', hostname: host, port });
  const serverStatus = await isDevServerRunning(serverBaseUrl, projectRoot);

  if (serverStatus === 'matched_server_running') {
    logger.warn(`A dev server is already running for this project on port ${port}. Exiting.`);
    process.exit(1);
  } else if (serverStatus === 'port_taken') {
    logger.error(
      `Another process is running on port ${port}. Please terminate this ` +
        'process and try again, or use another port with "--port".',
    );
    process.exit(1);
  }

  const fastify = Fastify({
    loggerInstance: new DevServerLogger(),
    disableRequestLogging: true,
  });

  const instanceManager = new InstanceManager(config);
  const serveBundleOptions: ServeBundlePluginOptions = {
    getBundler: (bundleName, buildOptions) => {
      return instanceManager.getBundler(bundleName, buildOptions);
    },
  };

  const {
    middleware: communityMiddleware,
    websocketEndpoints: communityWebsocketEndpoints,
    messageSocketEndpoint: { broadcast },
    eventsSocketEndpoint: { reportEvent },
  } = createDevServerMiddleware({
    port,
    host,
    watchFolders: [],
  });

  const { middleware: devMiddleware, websocketEndpoints } = createDevMiddleware({
    serverBaseUrl,
    logger: {
      info(...args) {
        if (args[0].includes('JavaScript logs have moved')) {
          return;
        }
        logger.info(...args);
      },
      warn: logger.warn.bind(logger),
      error: logger.error.bind(logger),
    },
    unstable_experiments: {
      enableNetworkInspector: true,
      enableStandaloneFuseboxShell: true,
    },
  });

  const hotWebSocketServer = hot({
    reportEvent: (event) => {
      reportEvent?.(event);
      reporter?.update(event);
    },
  });

  await fastify.register(import('@fastify/middie'));

  fastify
    .use(communityMiddleware)
    .use(devMiddleware)
    .register(symbolicate)
    .register(serveBundle, serveBundleOptions)
    .register(serveAssets, { projectRoot, host, port, https })
    .setErrorHandler(errorHandler);

  return fastify.listen({ port, host }).then(() => {
    fastify.server.on(
      'upgrade',
      getWebSocketUpgradeHandler({
        ...communityWebsocketEndpoints,
        ...websocketEndpoints,
        '/hot': hotWebSocketServer,
      }),
    );

    return {
      instance: fastify,
      message: { broadcast },
      events: { reportEvent },
    };
  });
}
