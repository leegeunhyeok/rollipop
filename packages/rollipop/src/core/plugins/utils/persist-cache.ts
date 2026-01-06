import fs from 'node:fs';

import type * as rolldown from 'rolldown';

import { PluginOption } from '../../../config';
import { logger } from '../../../logger';
import { xxhash } from '../../../utils/hash';
import type { BundlerContext } from '../../types';
import type { Plugin } from '../types';
import { TransformFlag, getFlag, setFlag } from './transform-flags';

export interface WithCacheOptions {
  enabled: boolean;
  sourceExtensions: string[];
  context: BundlerContext;
}

/**
 * @internal
 */
export function withPersistCache(
  plugins: PluginOption[],
  options: WithCacheOptions,
): rolldown.RolldownPluginOption {
  const { enabled, sourceExtensions, context } = options;

  if (!enabled) {
    return plugins;
  }

  const includePattern = new RegExp(`\\.(?:${sourceExtensions.join('|')})$`);
  const excludePattern = /@oxc-project\+runtime/;
  let cacheHits = 0;

  const startMarker: rolldown.Plugin = {
    name: 'rollipop:persist-cache-start',
    buildStart() {
      cacheHits = 0;
    },
    buildEnd() {
      this.debug(`Cache hits: ${cacheHits}`);
    },
    load: {
      order: 'pre',
      filter: {
        id: {
          include: includePattern,
          exclude: excludePattern,
        },
      },
      handler(id) {
        const key = getCacheKey(id, context.id);
        const cache = context.cache.get(key);

        if (cache != null) {
          cacheHits++;
          return {
            code: cache,
            moduleType: 'tsx',
            meta: setFlag(this, id, TransformFlag.SKIP_ALL),
          };
        }
      },
    },
  };

  const endMarker: rolldown.Plugin = {
    name: 'rollipop:persist-cache-end',
    transform: {
      order: 'post',
      filter: {
        id: {
          include: includePattern,
          exclude: excludePattern,
        },
      },
      handler(code, id) {
        // To avoid the re-caching
        if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
          return;
        }
        context.cache.set(getCacheKey(id, context.id), code);
      },
    },
  };

  return [startMarker, ...plugins, endMarker];
}

function getCacheKey(id: string, buildHash: string) {
  const { mtimeMs } = fs.statSync(id);
  return xxhash(`${id}${buildHash}${mtimeMs}`);
}

/**
 * Enhance a plugin to cache the result. (transform hook only)
 */
export function cacheable(plugin: Plugin) {
  let configured = false;
  const originalTransform = plugin.transform;

  if (typeof originalTransform === 'function') {
    plugin.transform = function (code, id, meta) {
      if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
        return;
      }

      return originalTransform.call(this, code, id, meta);
    };
    configured = true;
  }

  if (typeof originalTransform === 'object') {
    plugin.transform = {
      ...originalTransform,
      handler(code, id, meta) {
        if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
          return;
        }

        return originalTransform.handler.call(this, code, id, meta);
      },
    };
    configured = true;
  }

  if (configured) {
    plugin.name = `${plugin.name}:cacheable`;
  } else {
    logger.warn(`Plugin '${plugin.name}' is could not be cached`);
  }

  return plugin;
}
