import MagicString from 'magic-string';
import type * as rolldown from '@rollipop/rolldown';

import { TRANSFORM_FLAGS_KEY, TransformFlag } from '../core/plugins/utils/transform-utils';

export function testPluginDriver(
  plugins: rolldown.Plugin | rolldown.Plugin[],
  initialModuleInfo: Record<string, TransformFlag> = {},
) {
  const context = {
    getModuleInfo: (id: string) => {
      return {
        meta: initialModuleInfo[id] == null ? {} : { [TRANSFORM_FLAGS_KEY]: initialModuleInfo[id] },
      };
    },
  } as any;

  function invokeLoad(this: rolldown.Plugin, id: string) {
    if (typeof this.load === 'function') {
      return this.load.call(context, id);
    }

    if (typeof this.load === 'object') {
      return this.load.handler.call(context, id);
    }
  }

  function invokeTransform(this: rolldown.Plugin, code: string, id: string) {
    // Use MagicString instead of rolldown's native magic string
    const magicString = new MagicString(code);
    const meta: any = { magicString };

    if (typeof this.transform === 'function') {
      return this.transform.call(context, code, id, meta);
    }

    if (typeof this.transform === 'object') {
      return this.transform.handler.call(context, code, id, meta);
    }
  }

  return {
    load: async (id: string) => {
      for (const plugin of Array.isArray(plugins) ? plugins : [plugins]) {
        const result = await invokeLoad.bind(plugin)(id);

        if (result != null) {
          return result;
        }
      }
    },
    transform: async (code: string, id: string) => {
      let currentResult: rolldown.TransformResult = { code };
      for (const plugin of Array.isArray(plugins) ? plugins : [plugins]) {
        let currentCode = code;

        if (typeof currentResult === 'string') {
          currentCode = currentResult;
        } else if (currentResult != null && 'code' in currentResult) {
          if (typeof currentResult.code === 'string') {
            currentCode = currentResult.code;
          } else if (currentResult.code != null) {
            currentCode = currentResult.code.toString();
          }
        }

        const result = await invokeTransform.bind(plugin)(currentCode, id);

        if (result != null) {
          currentResult = result;
        }
      }

      return currentResult;
    },
  };
}
