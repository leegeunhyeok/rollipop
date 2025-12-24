import type { HMRCustomHandler } from './types/hmr';

declare var __DEV__: boolean;

declare global {
  var __ROLLIPOP_CUSTOM_HMR_HANDLER__: HMRCustomHandler | undefined;
}

/**
 * Set a custom HMR handler.
 *
 * @param handler - The custom HMR handler to set.
 */
export function setCustomHMRHandler(handler: HMRCustomHandler) {
  if (__DEV__) {
    if (globalThis.__ROLLIPOP_CUSTOM_HMR_HANDLER__ != null) {
      console.warn('Custom HMR handler already set. replacing existing handler.');
    }
    globalThis.__ROLLIPOP_CUSTOM_HMR_HANDLER__ = handler;
  }
}
