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

        return {
          code: `export = ${rawJson};`,
          meta: setFlag(this, id, TransformFlag.SKIP_ALL),
          moduleType: 'ts',
        };
      },
    },
  };
}

export { jsonPlugin as json };
