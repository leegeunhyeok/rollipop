import type * as swc from '@swc/core';
import { mergeWith } from 'es-toolkit';

export function mergeSwcOptions(baseOptions: swc.Options, ...options: swc.Options[]) {
  return options.reduce((acc, options) => mergeWith(acc, options, merge), baseOptions);
}

function merge(target: any, source: any, key: string) {
  if (key === 'plugins') {
    return [...(target ?? []), ...(source ?? [])];
  }
}
