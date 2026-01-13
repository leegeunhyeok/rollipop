import type * as rolldown from '@rollipop/rolldown';

export interface StatusPluginOptions {
  initialTotalModules?: number;
  onStart?: () => void;
  onEnd?: (result: StatusPluginEndResult) => void;
  onTransform?: (result: StatusPluginTransformResult) => void;
  onWatchChange?: (id: string) => void;
}

export interface StatusPluginTransformResult {
  id: string;
  totalModules: number | undefined;
  transformedModules: number;
}

export interface StatusPluginEndResult {
  totalModules: number;
  duration: number;
  error: Error | undefined;
}

function statusPlugin(options?: StatusPluginOptions): rolldown.Plugin | null {
  let totalModules = options?.initialTotalModules ?? 0;
  let startedAt = 0;
  let transformedModules = 0;
  let unknownTotalModules = totalModules === 0;

  return {
    name: 'rollipop:status',
    buildStart() {
      startedAt = performance.now();
      transformedModules = 0;
      options?.onStart?.();
    },
    buildEnd(error) {
      if (transformedModules !== 0) {
        totalModules = transformedModules;
      }
      unknownTotalModules = false;
      options?.onEnd?.({
        error,
        totalModules,
        duration: performance.now() - startedAt,
      });
    },
    transform: {
      order: 'post',
      handler(_code, id) {
        ++transformedModules;
        if (!unknownTotalModules && totalModules < transformedModules) {
          totalModules = transformedModules;
        }
        options?.onTransform?.({
          id,
          totalModules: unknownTotalModules ? undefined : totalModules,
          transformedModules,
        });
      },
    },
    watchChange(id) {
      options?.onWatchChange?.(id);
    },
  };
}

export { statusPlugin as status };
