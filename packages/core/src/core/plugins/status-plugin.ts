import type * as rolldown from 'rolldown';

export interface StatusPluginOptions {
  onStart?: () => void;
  onEnd?: (result: StatusPluginEndResult) => void;
  onResolve?: (id: string) => void;
  onTransform?: (result: StatusPluginTransformResult) => void;
}

export interface StatusPluginTransformResult {
  id: string;
  transformedModules: number;
}

export interface StatusPluginEndResult {
  transformedModules: number;
  duration: number;
  hasErrors: boolean;
}

function statusPlugin(options?: StatusPluginOptions): rolldown.Plugin {
  let startedAt = 0;
  let transformedModules = 0;

  return {
    name: 'rollipop:status',
    buildStart() {
      startedAt = performance.now();
      transformedModules = 0;
      options?.onStart?.();
    },
    buildEnd(error) {
      options?.onEnd?.({
        transformedModules,
        duration: performance.now() - startedAt,
        hasErrors: Boolean(error),
      });
    },
    resolveId: {
      order: 'post',
      handler(id) {
        options?.onResolve?.(id);
      },
    },
    transform: {
      order: 'post',
      handler(_code, id) {
        ++transformedModules;
        options?.onTransform?.({ id, transformedModules });
      },
    },
  };
}

export { statusPlugin as status };
