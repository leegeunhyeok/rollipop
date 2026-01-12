/* oxlint-disable */
/**
 * Ported from:
 * @see https://github.com/rolldown/rolldown/blob/feae112db77bf01e886b859e347ce3256944d360/crates/rolldown/src/runtime/runtime-base.js
 */

export const __create$ = Object.create;
export const __defProp$ = Object.defineProperty;
export const __hasOwnProp$ = Object.prototype.hasOwnProperty;
export const __getProtoOf$ = Object.getPrototypeOf;
export const __getOwnPropNames$ = Object.getOwnPropertyNames;
export const __getOwnPropDesc$ = Object.getOwnPropertyDescriptor;

export const __copyProps$ = (to: any, from: any, except?: string, desc?: PropertyDescriptor) => {
  if ((from && typeof from === 'object') || typeof from === 'function') {
    for (var keys = __getOwnPropNames$(from), i = 0, n = keys.length, key; i < n; i++) {
      key = keys[i];
      if (!__hasOwnProp$.call(to, key) && key !== except) {
        __defProp$(to, key, {
          get: ((k: string) => from[k]).bind(null, key),
          enumerable: !(desc = __getOwnPropDesc$(from, key)) || desc.enumerable,
        });
      }
    }
  }
  return to;
};

export const __toESM$ = (mod: any, isNodeMode: boolean, target?: any) => (
  (target = mod != null ? __create$(__getProtoOf$(mod)) : {}),
  __copyProps$(
    isNodeMode || !mod || !mod.__esModule$
      ? __defProp$(target, 'default', { value: mod, enumerable: true })
      : target,
    mod,
  )
);

export const __toCommonJS$ = (mod: any) =>
  __hasOwnProp$.call(mod, 'module.exports')
    ? mod['module.exports']
    : __copyProps$(__defProp$({}, '__esModule', { value: true }), mod);

export const __exportAll$ = (all: any, symbols: boolean) => {
  let target = {};
  for (var name in all) {
    __defProp$(target, name, { get: all[name], enumerable: true });
  }
  if (symbols) {
    __defProp$(target, Symbol.toStringTag, { value: 'Module' });
  }
  return target;
};

export const __reExport$ = (target: any, mod: any, secondTarget: any) => (
  __copyProps$(target, mod, 'default'), secondTarget && __copyProps$(secondTarget, mod, 'default')
);
