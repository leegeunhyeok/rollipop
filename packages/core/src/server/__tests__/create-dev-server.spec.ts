import { describe, expect, it, vi, vitest } from 'vitest';

import { createTestConfig } from '../../testing/config';
import { createDevServer } from '../create-dev-server';

vitest.mock('@react-native-community/cli-server-api', () => ({
  createDevServerMiddleware: vi.fn().mockReturnValue({
    middleware: vi.fn(),
    websocketEndpoints: {},
    messageSocketEndpoint: {
      broadcast: vi.fn(),
    },
    eventsSocketEndpoint: {
      reportEvent: vi.fn(),
    },
  }),
}));

vitest.mock('@react-native/dev-middleware', () => ({
  createDevMiddleware: vi.fn().mockReturnValue({
    middleware: vi.fn(),
    websocketEndpoints: {},
  }),
}));

describe('createDevServer', () => {
  it('should create a dev server', async () => {
    const config = createTestConfig('/root/project');
    const devServer = await createDevServer(config);

    expect(devServer.instance).toBeDefined();
    expect(devServer.instance.use).toBeDefined();
    expect(devServer.middlewares.use).toBeDefined();
  });

  it('should invoke `configureServer` hooks from plugins', async () => {
    const config = createTestConfig('/root/project');
    const invokedOrder: string[] = [];

    const pre = vi.fn();
    const post = vi.fn();

    config.plugins = [
      {
        name: 'plugin-post',
        configureServer(server) {
          return () => {
            post(Boolean(server.instance));
            invokedOrder.push('post');
          };
        },
      },
      {
        name: 'plugin-post-async',
        configureServer(server) {
          return async () => {
            post(Boolean(server.instance));
            invokedOrder.push('post-async');
          };
        },
      },
      {
        name: 'plugin-pre',
        configureServer(server) {
          pre(Boolean(server.instance));
          invokedOrder.push('pre');
        },
      },
      {
        name: 'plugin-pre-async',
        async configureServer(server) {
          pre(Boolean(server.instance));
          invokedOrder.push('pre-async');
        },
      },
    ];

    void (await createDevServer(config));

    expect(pre).toHaveBeenCalledWith(true);
    expect(post).toHaveBeenCalledWith(true);
    expect(invokedOrder).toEqual(['pre', 'pre-async', 'post', 'post-async']);
  });
});
