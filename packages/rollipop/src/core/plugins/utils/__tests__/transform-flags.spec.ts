import type * as rolldown from '@rollipop/rolldown';
import { describe, it, expect } from 'vite-plus/test';

import { setFlag, hasFlag, TransformFlag, TRANSFORM_FLAGS_KEY } from '../transform-utils';

function createPluginContext(initialModuleInfo: Record<string, TransformFlag> = {}) {
  return {
    meta: {},
    getModuleInfo: (id: string) => {
      return {
        meta: initialModuleInfo[id] == null ? {} : { [TRANSFORM_FLAGS_KEY]: initialModuleInfo[id] },
      };
    },
  } as unknown as rolldown.PluginContext;
}

function flag(meta: any) {
  return meta[TRANSFORM_FLAGS_KEY];
}

describe('setFlag', () => {
  it('should set the flag', () => {
    const id = 'test.js';
    const context = createPluginContext();
    expect(hasFlag(context.meta)).toBe(false);

    const meta = setFlag(context, id, TransformFlag.SKIP_ALL);
    expect(flag(meta)).toBe(TransformFlag.SKIP_ALL);
  });
});
