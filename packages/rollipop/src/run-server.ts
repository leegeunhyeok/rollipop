import type { ResolvedConfig } from '@rollipop/core';
import { createDevServer, DevServer, type ServerOptions } from '@rollipop/dev-server';

export async function runServer(
  config: ResolvedConfig,
  options: ServerOptions,
): Promise<DevServer> {
  const { port, host } = options;
  const devServer = await createDevServer(config, options);

  await devServer.instance.listen({ port, host });

  return devServer;
}
