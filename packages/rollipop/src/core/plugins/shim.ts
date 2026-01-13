import type * as rolldown from '@rollipop/rolldown';

export function shim(): rolldown.Plugin {
  return { name: `rollipop:shim-${shim.index++}` };
}

shim.index = 0;
