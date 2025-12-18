import fs from 'node:fs';

import type * as rolldown from 'rolldown';

function jsonPlugin(): rolldown.Plugin {
  return {
    name: 'rollipop:json',
    load: {
      filter: {
        id: /\.json$/,
      },
      handler(id) {
        const rawJson = fs.readFileSync(id, 'utf-8');
        const json = JSON.parse(rawJson);

        return {
          code: jsonToEsm(json),
          moduleType: 'js',
        };
      },
    },
  };
}

function jsonToEsm(data: Record<string, unknown>) {
  const keys = new Set<string>();
  const fields = Object.entries(data).map(([key, value]) => {
    keys.add(key);
    return `export const ${key} = ${JSON.stringify(value)};`;
  });

  return [...fields, `export default ${JSON.stringify(data)};`].join('\n');
}

export { jsonPlugin as json };
