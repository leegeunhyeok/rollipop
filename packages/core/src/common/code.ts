import dedent from 'dedent';

import { GLOBAL_IDENTIFIER } from '../constants';
import { indent } from '../utils/string';

export function asLiteral(value: unknown) {
  return JSON.stringify(value);
}

export function asIdentifier(name: string) {
  return name;
}

export function nodeEnvironment(dev: boolean) {
  return dev ? 'development' : 'production';
}

export function iife(body: string, path = '<unknown>') {
  const bodyPlaceholder = '__BODY__';

  /**
   * ```
   * // foo.js
   * (function (global) {
   *   __BODY__
   * })(__ROLLIPOP_GLOBAL);
   * ```
   */
  const iife = dedent`
  // ${path}
  (function (global) {
  ${bodyPlaceholder}
  })(${GLOBAL_IDENTIFIER});
  `;

  return iife.replace(bodyPlaceholder, indent(body, 1));
}
