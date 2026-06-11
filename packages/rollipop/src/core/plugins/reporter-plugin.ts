import type * as rolldown from '@rollipop/rolldown';

import type { Reporter } from '../../types';

export interface ReporterPluginOptions {
  initialTotalModules?: number;
  reporter?: Reporter;
}

function reporterPlugin(options?: ReporterPluginOptions): rolldown.Plugin | null {
  const { reporter, initialTotalModules = 0 } = options ?? {};
  let lastBuildTotalModules = initialTotalModules;
  let totalModules = initialTotalModules;
  let startedAt = 0;
  let transformedModules = 0;
  let cacheHitModules = 0;
  let unknownTotalModules = totalModules === 0;
  let countCacheHitModules = true;

  function getProcessedModules() {
    return transformedModules + cacheHitModules;
  }

  function resetIncrementalProgress() {
    startedAt = performance.now();
    transformedModules = 0;
    cacheHitModules = 0;
    totalModules = 0;
    unknownTotalModules = false;
    countCacheHitModules = false;
  }

  function resetBuildProgress() {
    startedAt = performance.now();
    transformedModules = 0;
    cacheHitModules = 0;
    totalModules = lastBuildTotalModules;
    unknownTotalModules = totalModules === 0;
    countCacheHitModules = true;
  }

  function reportProgress(id: string) {
    const processedModules = getProcessedModules();
    if (!unknownTotalModules && totalModules < processedModules) {
      totalModules = processedModules;
    }
    reporter?.update({
      type: 'transform',
      id,
      totalModules: unknownTotalModules ? undefined : totalModules,
      transformedModules: processedModules,
    });
  }

  return {
    name: 'rollipop:status',
    buildStart() {
      resetBuildProgress();
      reporter?.update({ type: 'bundle_build_started' });
    },
    buildEnd(error) {
      const endedAt = performance.now();
      const processedModules = getProcessedModules();
      if (processedModules !== 0) {
        totalModules = processedModules;
        lastBuildTotalModules = processedModules;
      }
      unknownTotalModules = false;
      reporter?.update(
        error == null
          ? {
              type: 'bundle_build_done',
              totalModules,
              transformedModules,
              cacheHitModules,
              duration: endedAt - startedAt,
            }
          : { type: 'bundle_build_failed', error },
      );
    },
    transform: {
      order: 'post',
      handler(_code, id) {
        ++transformedModules;
        reportProgress(id);
      },
    },
    transformCacheHit(id) {
      if (!countCacheHitModules) {
        return;
      }
      ++cacheHitModules;
      reportProgress(id);
    },
    watchChange(id) {
      // HMR patches can run watchChange -> transform without buildStart.
      resetIncrementalProgress();
      reporter?.update({ type: 'watch_change', id });
    },
  };
}

export { reporterPlugin as reporter };
