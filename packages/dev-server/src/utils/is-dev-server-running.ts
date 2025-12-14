import http from 'node:http';

export async function isDevServerRunning(
  devServerUrl: string,
  projectRoot: string,
): Promise<'not_running' | 'matched_server_running' | 'port_taken' | 'unknown'> {
  const { hostname, port } = new URL(devServerUrl);

  try {
    if (!(await isPortOccupied(hostname, port))) {
      return 'not_running';
    }

    const statusResponse = await fetch(`${devServerUrl}/status`);
    const body = await statusResponse.text();

    return body === 'packager-status:running' &&
      statusResponse.headers.get('X-React-Native-Project-Root') === projectRoot
      ? 'matched_server_running'
      : 'port_taken';
  } catch {
    return 'unknown';
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
