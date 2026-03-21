import type { Plugin } from 'rollipop';

export function config(): Plugin {
  const log = (...args: any[]) => {
    if (process.env.SHOW_CONFIG === '1') {
      console.log(...args);
    }
  };

  return {
    name: 'config',
    configureServer() {
      log('configureServer:pre');
      return () => {
        log('configureServer:post');
      };
    },
    configResolved(resolvedConfig) {
      log(resolvedConfig);
    },
  };
}

export function hot(): Plugin | null {
  if (process.env.HOT !== '1') {
    return null;
  }

  let count = 0;
  return {
    name: 'hot',
    configureServer(server) {
      setInterval(() => {
        if (server.hot.clients.size === 0) {
          this.debug('No clients connected, skipping sending message');
          return;
        } else {
          this.debug('Sending message to clients...');
        }

        server.hot.sendAll('custom-server-event', { message: `Hello from server: ${count++}` });
      }, 5_000);

      server.hot.on('custom-client-event', (data) => {
        console.log('Received custom client event:', data);
      });
    },
  };
}
