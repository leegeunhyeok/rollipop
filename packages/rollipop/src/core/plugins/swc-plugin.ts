import * as swc from '@swc/core';
import type * as rolldown from 'rolldown';

import type { TransformerConfig } from '../../config';
import { mergeSwcOptions } from '../../utils/swc';
import { cacheable } from './utils';
import { getFlag, TransformFlag } from './utils/transform-utils';

function swcPlugin(options?: TransformerConfig['swc']): rolldown.Plugin[] {
  const { rules = [] } = options ?? {};
  const swcOptionsById: Map<string, swc.Options[]> = new Map();

  const swcRules = rules.map(({ filter, options }, index) => {
    return {
      name: `rollipop:swc-rule-${index}`,
      transform: {
        filter,
        handler(code, id) {
          const existingBabelOptions = swcOptionsById.get(id);
          const resolvedOptions = typeof options === 'function' ? options(code, id) : options;
          void (existingBabelOptions
            ? existingBabelOptions.push(resolvedOptions)
            : swcOptionsById.set(id, [resolvedOptions]));
        },
      },
    } satisfies rolldown.Plugin;
  });

  const swcPlugin: rolldown.Plugin = {
    name: 'rollipop:swc',
    buildStart() {
      swcOptionsById.clear();
    },
    transform: {
      handler(code, id) {
        if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
          return;
        }

        const swcOptions = swcOptionsById.get(id) ?? [];
        const baseOptions = getPreset();
        const result = swc.transformSync(code, {
          filename: id,
          configFile: false,
          swcrc: false,
          sourceMaps: true,
          // Disables the input source map to prevent error logs when
          // swc cannot find the source map file (e.g., in Yarn PnP environments).
          inputSourceMap: false,
          ...mergeSwcOptions(baseOptions, ...swcOptions),
        });

        return { code: result.code, map: result.map };
      },
    },
  };

  return [...swcRules, swcPlugin].map(cacheable);
}

function getPreset(): swc.Options {
  return {
    jsc: {
      target: 'es5',
      parser: {
        // Parse as TypeScript code because Flow modules can be `.js` files with type annotations
        syntax: 'typescript',
        // Always enable JSX parsing because Flow modules can be `.js` files with JSX syntax
        tsx: true,
      },
      keepClassNames: true,
      loose: false,
      transform: {
        react: {
          runtime: 'preserve',
        },
      },
      assumptions: {
        setPublicClassFields: true,
        privateFieldsAsProperties: true,
      },
    },
    isModule: true,
  };
}

export { swcPlugin as swc };
