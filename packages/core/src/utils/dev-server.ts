import http from 'node:http';

import { logger } from '../server/logger';

interface AssertDevServerOptions {
  devServerUrl: string;
  projectRoot: string;
  port: number;
}

export async function assertDevServerStatus(options: AssertDevServerOptions) {
  const { devServerUrl, projectRoot, port } = options;
  const status = await getDevServerStatus(devServerUrl, projectRoot);
  let shouldExit = false;

  switch (status) {
    case DevServerStatus.MATCHED_SERVER_RUNNING:
      logger.warn(`A dev server is already running for this project on port ${port}. Exiting.`);
      shouldExit = true;
      break;
    case DevServerStatus.PORT_TAKEN:
      logger.error(
        `Another process is running on port ${port}. Please terminate this ` +
          'process and try again, or use another port with "--port".',
      );
      shouldExit = true;
      break;
  }

  if (shouldExit) {
    process.exit(1);
  }
}

enum DevServerStatus {
  NOT_RUNNING,
  MATCHED_SERVER_RUNNING,
  PORT_TAKEN,
  UNKNOWN,
}

async function getDevServerStatus(
  devServerUrl: string,
  projectRoot: string,
): Promise<DevServerStatus> {
  const { hostname, port } = new URL(devServerUrl);

  try {
    if (!(await isPortOccupied(hostname, port))) {
      return DevServerStatus.NOT_RUNNING;
    }

    const statusResponse = await fetch(`${devServerUrl}/status`);
    const body = await statusResponse.text();

    return body === 'packager-status:running' &&
      statusResponse.headers.get('X-React-Native-Project-Root') === projectRoot
      ? DevServerStatus.MATCHED_SERVER_RUNNING
      : DevServerStatus.PORT_TAKEN;
  } catch {
    return DevServerStatus.UNKNOWN;
  }
}

async function isPortOccupied(host: string, port: string): Promise<boolean> {
  let result = false;
  const server = http.createServer();

  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      server.close();
      if ((error as Error & { code?: string }).code === 'EADDRINUSE') {
        result = true;
      } else {
        reject(error);
      }
    });

    server.once('listening', () => {
      result = false;
      server.close();
    });

    server.once('close', () => resolve(result));

    server.listen({ host, port });
  });
}
