import * as babel from '@babel/core';
import type * as rolldown from '@rollipop/rolldown';
import { invariant } from 'es-toolkit';

import type { TransformerConfig } from '../../config';
import { mergeBabelOptions } from '../../utils/babel';
import { getFlag, TransformFlag } from './utils/transform-utils';

function babelPlugin(options?: TransformerConfig['babel']): rolldown.Plugin[] {
  const { rules = [] } = options ?? {};
  const babelOptionsById: Map<string, babel.TransformOptions[]> = new Map();

  const babelRules = rules.map(({ filter, options }, index) => {
    return {
      name: `rollipop:babel-rule-${index}`,
      transform: {
        filter,
        handler(code, id) {
          const existingBabelOptions = babelOptionsById.get(id);
          const resolvedOptions = typeof options === 'function' ? options(code, id) : options;
          void (existingBabelOptions
            ? existingBabelOptions.push(resolvedOptions)
            : babelOptionsById.set(id, [resolvedOptions]));
        },
      },
    } satisfies rolldown.Plugin;
  });

  const babelPlugin: rolldown.Plugin = {
    name: 'rollipop:babel',
    buildStart() {
      babelOptionsById.clear();
    },
    transform: {
      handler(code, id) {
        const flags = getFlag(this, id);
        if (flags & TransformFlag.SKIP_ALL) {
          return;
        }

        const babelOptions = babelOptionsById.get(id) ?? [];
        const shouldTransform = babelOptions.length > 0;
        if (!shouldTransform) {
          return;
        }

        const result = babel.transformSync(code, {
          filename: id,
          babelrc: false,
          configFile: false,
          sourceMaps: true,
          ...mergeBabelOptions({}, ...babelOptions),
        });
        invariant(result?.code, `Failed to transform with babel: ${id}`);

        return { code: result.code, map: result.map };
      },
    },
  };

  return [...babelRules, babelPlugin];
}

export { babelPlugin as babel };
