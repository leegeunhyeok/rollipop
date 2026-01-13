import fs from 'node:fs';

import { exclude, id, include } from '@rollipop/rolldown-pluginutils';

import { logger } from '../../../logger';
import { xxhash } from '../../../utils/hash';
import type { BundlerContext } from '../../types';
import type { Plugin } from '../types';
import { TransformFlag, getFlag, setFlag } from './transform-utils';

export interface PersistCachePluginsOptions {
  enabled: boolean;
  sourceExtensions: string[];
  context: BundlerContext;
}

export function getPersistCachePlugins(options: PersistCachePluginsOptions) {
  if (!options.enabled) {
    return { beforeTransform: null, afterTransform: null };
  }

  const { sourceExtensions, context } = options;
  const includePattern = new RegExp(`\\.(?:${sourceExtensions.join('|')})$`);
  const excludePattern = /@oxc-project\+runtime/;
  const filter = [exclude(id(excludePattern)), include(id(includePattern))];
  let cacheHits = 0;

  const beforeTransform: Plugin = {
    name: 'rollipop:persist-cache-start',
    buildStart() {
      cacheHits = 0;
    },
    buildEnd() {
      this.debug(`Cache hits: ${cacheHits}`);
    },
    transform: {
      order: 'pre',
      filter,
      handler(_code, id) {
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

  const afterTransform: Plugin = {
    name: 'rollipop:persist-cache-end',
    transform: {
      order: 'post',
      filter,
      handler(code, id) {
        // To avoid the re-caching
        if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
          return;
        }
        context.cache.set(getCacheKey(id, context.id), code);
      },
    },
    buildEnd() {
      void context.cache.flush().then(() => logger.trace('Cache flushed'));
    },
  };

  return { beforeTransform, afterTransform };
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
