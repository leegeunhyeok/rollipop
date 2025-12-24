import url from 'url';

import { createDevServerMiddleware } from '@react-native-community/cli-server-api';
import { createDevMiddleware } from '@react-native/dev-middleware';
import Fastify from 'fastify';

import type { ResolvedConfig } from '../config';
import type { Plugin } from '../core/plugins/types';
import type { BuildOptions } from '../core/types';
import { assertDevServerStatus } from '../utils/dev-server';
import { BundlerPool } from './bundler-pool';
import { DEFAULT_HOST, DEFAULT_PORT } from './constants';
import { errorHandler } from './error';
import { DevServerLogger, logger } from './logger';
import { serveAssets } from './middlewares/serve-assets';
import { serveBundle } from './middlewares/serve-bundle';
import { symbolicate } from './middlewares/symbolicate';
import type { DevServer, ServerOptions } from './types';
import { HMRServer } from './wss/hmr-server';
import { getWebSocketUpgradeHandler } from './wss/server';

export async function createDevServer(
  config: ResolvedConfig,
  options: ServerOptions,
): Promise<DevServer> {
  const {
    projectRoot,
    port = DEFAULT_PORT,
    host = DEFAULT_HOST,
    https = false,
    onDeviceConnected,
    onDeviceMessage,
    onDeviceConnectionError,
    onDeviceDisconnected,
  } = options;

  if (https) {
    throw new Error('HTTPS is not supported yet');
  }

  const serverBaseUrl = url.format({ protocol: https ? 'https' : 'http', hostname: host, port });
  await assertDevServerStatus({ devServerUrl: serverBaseUrl, projectRoot, port });

  const fastify = Fastify({
    loggerInstance: new DevServerLogger(),
    disableRequestLogging: true,
  });

  const bundlerPool = new BundlerPool(config, { host, port });
  const getBundler = (bundleName: string, buildOptions: BuildOptions) => {
    return bundlerPool.get(bundleName, buildOptions);
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

  await fastify.register(import('@fastify/middie'));

  fastify
    .use(communityMiddleware)
    .use(devMiddleware)
    .register(symbolicate, { getBundler })
    .register(serveBundle, { getBundler })
    .register(serveAssets, {
      projectRoot,
      host,
      port,
      https,
      preferNativePlatform: config.resolver.preferNativePlatform,
    })
    .setErrorHandler(errorHandler);

  const hmrServer = new HMRServer({
    bundlerPool,
    reportEvent: (event) => {
      reportEvent?.(event);
      config.reporter.update(event);
    },
  })
    .on('connection', (client) => onDeviceConnected?.(client))
    .on('message', (client, data) => onDeviceMessage?.(client, data))
    .on('error', (client, error) => onDeviceConnectionError?.(client, error))
    .on('close', (client) => onDeviceDisconnected?.(client));

  fastify.server.on(
    'upgrade',
    getWebSocketUpgradeHandler({
      ...communityWebsocketEndpoints,
      ...websocketEndpoints,
      '/hot': hmrServer.server,
    }),
  );

  const devServer: DevServer = {
    config,
    instance: fastify,
    message: { broadcast },
    events: { reportEvent },
  };

  await invokeConfigureServer(devServer, config.plugins ?? []);

  return devServer;
}

async function invokeConfigureServer(server: DevServer, plugins: Plugin[]) {
  for (const plugin of plugins) {
    await plugin.configureServer?.(server);
  }
}
