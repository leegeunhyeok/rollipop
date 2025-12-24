import fs from 'node:fs';
import path from 'node:path';

import { DEV_SERVER_ASSET_PATH } from '@rollipop/common';
import fp from 'fastify-plugin';
import { asConst, type FromSchema } from 'json-schema-to-ts';
import mime from 'mime';

import * as AssetUtils from '../../core/assets';

const queryParamSchema = asConst({
  type: 'object',
  properties: {
    platform: {
      type: 'string',
    },
    hash: {
      type: 'string',
    },
  },
  required: ['platform'],
});

type QueryParams = FromSchema<typeof queryParamSchema>;

export interface ServeAssetPluginOptions {
  projectRoot: string;
  https: boolean;
  host: string;
  port: number;
  preferNativePlatform: boolean;
}

const plugin = fp<ServeAssetPluginOptions>(
  (fastify, options) => {
    const { projectRoot, host, port, https, preferNativePlatform } = options;
    const baseUrl = https ? `https://${host}:${port}` : `http://${host}:${port}`;

    function resolveAsset(asset: string) {
      return path.resolve(projectRoot, asset);
    }

    // TODO
    fastify.get<{ Querystring: QueryParams }>(`/${DEV_SERVER_ASSET_PATH}/*`, {
      schema: {
        querystring: queryParamSchema,
      },
      async handler(request, reply) {
        const { url, query } = request;
        const { pathname } = new URL(url, baseUrl);
        const assetPath = resolveAsset(
          pathname.replace(new RegExp(`^/${DEV_SERVER_ASSET_PATH}/?`), ''),
        );

        let handle: fs.promises.FileHandle | null = null;
        try {
          handle = await fs.promises.open(
            AssetUtils.resolveAssetPath(
              assetPath,
              { platform: query.platform, preferNativePlatform },
              1,
            ),
            'r',
          );
          const assetData = await handle.readFile();
          const { size } = await handle.stat();

          await reply
            .header('Content-Type', mime.getType(assetPath) ?? '')
            .header('Content-Length', size)
            .send(assetData);
        } catch (error) {
          // TODO
          fastify.log.error(
            error,
            'Failed to serve asset (scale assets resolving is not implemented yet)',
          );
          await reply.status(500).send();
        } finally {
          await handle?.close();
        }
      },
    });
  },
  { name: 'serve-assets' },
);

export { plugin as serveAssets };
