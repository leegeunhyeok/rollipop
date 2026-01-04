import fs from 'node:fs';

import { id, include } from '@rolldown/pluginutils';
import type * as rolldown from 'rolldown';

import { setFlag, TransformFlag } from './utils/transform-flags';

function jsonPlugin(): rolldown.Plugin {
  return {
    name: 'rollipop:json',
    load: {
      filter: [include(id(/\.json$/))],
      handler(id) {
        const rawJson = fs.readFileSync(id, 'utf-8');
        const json = JSON.parse(rawJson);

        return {
          code: jsonToEsm(json),
          meta: setFlag(this, id, TransformFlag.SKIP_ALL),
          moduleType: 'js',
        };
      },
    },
  };
}

function jsonToEsm(data: Record<string, unknown>) {
  const declarations: string[] = [];
  const exports: string[] = [];
  const exportDefaultMappings: string[] = [];

  Object.entries(data).forEach(([key, value], index) => {
    const identifier = `_${index}`;
    declarations.push(`const ${identifier} = ${JSON.stringify(value)};`);
    exports.push(`export { ${identifier} as "${key}" };`);
    exportDefaultMappings.push(`"${key}":${identifier}`);
  });

  return [...declarations, ...exports, `export default {${exportDefaultMappings.join(',')}};`].join(
    '\n',
  );
}

export { jsonPlugin as json };
