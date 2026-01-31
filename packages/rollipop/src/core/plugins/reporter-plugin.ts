import type * as rolldown from '@rollipop/rolldown';

import type { Reporter } from '../../types';

export interface ReporterPluginOptions {
  initialTotalModules?: number;
  reporter?: Reporter;
}

function reporterPlugin(options?: ReporterPluginOptions): rolldown.Plugin | null {
  const { reporter, initialTotalModules = 0 } = options ?? {};
  let totalModules = initialTotalModules;
  let startedAt = 0;
  let transformedModules = 0;
  let unknownTotalModules = totalModules === 0;

  return {
    name: 'rollipop:status',
    buildStart() {
      startedAt = performance.now();
      transformedModules = 0;
      reporter?.update({ type: 'bundle_build_started' });
    },
    buildEnd(error) {
      const endedAt = performance.now();
      if (transformedModules !== 0) {
        totalModules = transformedModules;
      }
      unknownTotalModules = false;
      reporter?.update(
        error == null
          ? { type: 'bundle_build_done', totalModules, duration: endedAt - startedAt }
          : { type: 'bundle_build_failed', error },
      );
    },
    transform: {
      order: 'post',
      handler(_code, id) {
        ++transformedModules;
        if (!unknownTotalModules && totalModules < transformedModules) {
          totalModules = transformedModules;
        }
        reporter?.update({
          type: 'transform',
          id,
          totalModules: unknownTotalModules ? undefined : totalModules,
          transformedModules,
        });
      },
    },
    watchChange(id) {
      reporter?.update({ type: 'watch_change', id });
    },
  };
}

export { reporterPlugin as reporter };
