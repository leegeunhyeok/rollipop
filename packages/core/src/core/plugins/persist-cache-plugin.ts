import fs from 'node:fs';

import type * as rolldown from 'rolldown';

import { BundlerContext } from '../../core/types';
import { xxhash } from '../../utils/hash';
import { shim } from './shim';

const CACHE_HIT = Symbol('CACHE_HIT');
const CACHE_HITS = Symbol('CACHE_HITS');

export interface PersistCachePluginOptions {
  enabled: boolean;
  sourceExtensions: string[];
}

function persistCachePlugin(
  options: PersistCachePluginOptions,
  context: BundlerContext,
): rolldown.Plugin {
  if (!options.enabled) {
    return shim();
  }

  const includePattern = new RegExp(
    `\\.(?:${options.sourceExtensions.filter((extension) => extension !== 'json').join('|')})$`,
  );
  const excludePattern = /@oxc-project\+runtime/;
  let cacheHits = 0;

  return {
    name: 'rollipop:persist-cache',
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
          return { code: cache, moduleType: 'tsx', meta: { [CACHE_HIT]: true } };
        }
      },
    },
    transform: {
      order: 'post',
      filter: {
        id: {
          include: includePattern,
          exclude: excludePattern,
        },
      },
      handler(code, id) {
        const moduleInfo = this.getModuleInfo(id);

        // To avoid the re-caching
        if (!(moduleInfo && isCacheHit(moduleInfo.meta))) {
          const key = getCacheKey(id, context.id);
          context.cache.set(key, code);
        }
      },
    },
  };
}

/**
 * Enhance a plugin to cache the result. (transform hook only)
 */
persistCachePlugin.enhance = function enhance(plugin: rolldown.Plugin): rolldown.Plugin {
  const originalTransform = plugin.transform;

  if (typeof originalTransform === 'function') {
    plugin.transform = function (code, id, meta) {
      const moduleInfo = this.getModuleInfo(id);

      if (moduleInfo && isCacheHit(moduleInfo.meta)) {
        return;
      }

      return originalTransform.call(this, code, id, meta);
    };
  }

  if (typeof originalTransform === 'object') {
    plugin.transform = {
      ...originalTransform,
      handler(code, id, meta) {
        const moduleInfo = this.getModuleInfo(id);

        if (moduleInfo && isCacheHit(moduleInfo.meta)) {
          return;
        }

        return originalTransform.handler.call(this, code, id, meta);
      },
    };
  }

  return plugin;
};

type PersistCachePluginMeta = rolldown.CustomPluginOptions & {
  [CACHE_HIT]: true;
  [CACHE_HITS]: number;
};

function isCacheHit(meta: rolldown.CustomPluginOptions): meta is PersistCachePluginMeta {
  return CACHE_HIT in meta;
}

function getCacheKey(id: string, buildHash: string) {
  const { mtimeMs } = fs.statSync(id);
  return xxhash(`${id}${buildHash}${mtimeMs}`);
}

export { persistCachePlugin as persistCache };
