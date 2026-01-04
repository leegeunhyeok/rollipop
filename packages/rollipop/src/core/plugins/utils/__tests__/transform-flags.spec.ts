import type * as rolldown from 'rolldown';
import { describe, it, expect } from 'vitest';

import { setFlag, hasFlag, TransformFlag, TRANSFORM_FLAGS_KEY } from '../transform-flags';

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

    const meta = setFlag(context, id, TransformFlag.CODEGEN_REQUIRED);
    expect(flag(meta)).toBe(TransformFlag.CODEGEN_REQUIRED);
  });

  describe('when the module info exists', () => {
    it('should set the flag', () => {
      const id = 'test.js';
      const context = createPluginContext({
        [id]: TransformFlag.CODEGEN_REQUIRED,
      });

      const meta = setFlag(context, id, TransformFlag.STRIP_FLOW_REQUIRED);

      expect(
        Boolean(flag(meta) & (TransformFlag.CODEGEN_REQUIRED | TransformFlag.STRIP_FLOW_REQUIRED)),
      ).toBe(true);
    });
  });
});
