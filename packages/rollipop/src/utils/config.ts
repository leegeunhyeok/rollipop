import EventEmitter from 'node:events';
import fs from 'node:fs';

import type { HmrConfig, ResolvedConfig } from '../config';
import type { BundlerDevEngineEventMap } from '../server/bundler-pool';
import type { Reporter } from '../types';

export function bindReporter(
  config: ResolvedConfig,
  eventSource: EventEmitter<BundlerDevEngineEventMap>,
): ResolvedConfig {
  const originalReporter = config.reporter;
  const reporter: Reporter = {
    update(event) {
      switch (event.type) {
        case 'bundle_build_started':
          eventSource.emit('buildStart');
          break;

        case 'bundle_build_done':
          eventSource.emit('buildDone');
          break;

        case 'bundle_build_failed':
          eventSource.emit('buildFailed', event.error);
          break;

        case 'transform':
          eventSource.emit('transform', event.id, event.totalModules, event.transformedModules);
          break;

        case 'watch_change':
          eventSource.emit('watchChange', event.id);
          break;
      }
      originalReporter?.update(event);
    },
  };

  config.reporter = reporter;

  return config;
}

type ResolvedHmrConfig = Required<HmrConfig>;

export function resolveHmrConfig(config: ResolvedConfig): ResolvedHmrConfig | null {
  if (config.mode !== 'development') {
    return null;
  }

  const defaultRuntimeImplements = getDefaultRuntimeImplements();

  if (typeof config.devMode.hmr === 'boolean') {
    return config.devMode.hmr ? defaultRuntimeImplements : null;
  }

  const {
    runtimeImplement = defaultRuntimeImplements.runtimeImplement,
    clientImplement = defaultRuntimeImplements.clientImplement,
  } = config.devMode.hmr;

  return { runtimeImplement, clientImplement };
}

getDefaultRuntimeImplements.cache = null as ResolvedHmrConfig | null;
export function getDefaultRuntimeImplements(): ResolvedHmrConfig {
  if (getDefaultRuntimeImplements.cache == null) {
    getDefaultRuntimeImplements.cache = {
      runtimeImplement: fs.readFileSync(require.resolve('rollipop/hmr-runtime'), 'utf-8'),
      clientImplement: fs.readFileSync(require.resolve('rollipop/hmr-client'), 'utf-8'),
    };
  }
  return getDefaultRuntimeImplements.cache;
}
