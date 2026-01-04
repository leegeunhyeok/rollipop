import type * as rolldown from 'rolldown';

export const TRANSFORM_FLAGS_KEY = Symbol('transform-flags');

export type TransformMeta = rolldown.CustomPluginOptions & {
  [TRANSFORM_FLAGS_KEY]: TransformFlag;
};

export enum TransformFlag {
  NONE = 0b00000000,
  CODEGEN_REQUIRED = 0b00000001,
  STRIP_FLOW_REQUIRED = 0b00000010,
  SKIP_ALL = 0b10000000,
}

export function setFlag(
  context: rolldown.PluginContext,
  id: string,
  flag: TransformFlag,
): rolldown.CustomPluginOptions {
  const moduleInfo = context.getModuleInfo(id);
  if (moduleInfo && hasFlag(moduleInfo.meta)) {
    moduleInfo.meta[TRANSFORM_FLAGS_KEY] |= flag;
    return moduleInfo.meta;
  } else {
    return { [TRANSFORM_FLAGS_KEY]: flag };
  }
}

export function hasFlag(meta: rolldown.CustomPluginOptions): meta is TransformMeta {
  return TRANSFORM_FLAGS_KEY in meta;
}

export function getFlag(context: rolldown.PluginContext, id: string): TransformFlag {
  const moduleInfo = context.getModuleInfo(id);
  return getFlagFromModuleInfo(moduleInfo);
}

export function getFlagFromModuleInfo(moduleInfo: rolldown.ModuleInfo | null): TransformFlag {
  if (moduleInfo && hasFlag(moduleInfo.meta)) {
    return moduleInfo.meta[TRANSFORM_FLAGS_KEY];
  }
  return TransformFlag.NONE;
}
