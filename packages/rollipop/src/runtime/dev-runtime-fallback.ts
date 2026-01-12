/**
 * Ported from:
 * @see https://github.com/rolldown/rolldown/blob/v1.0.0-beta.59/crates/rolldown_plugin_hmr/src/runtime/runtime-extra-dev-common.js
 */

import type { HMRClientMessage } from '../types/hmr';
import { __exportAll$, __reExport$, __toCommonJS$, __toESM$ } from './runtime-utils';

export interface Messenger {
  send(message: HMRClientMessage): void;
}

export interface DevRuntime {
  modules: Record<string, ModuleFallback>;
  createModuleHotContext(moduleId: string): void;
  applyUpdates(boundaries: [string, string][]): void;
  registerModule(id: string, exportsHolder: ModuleFallback['exportsHolder']): void;
  loadExports(id: string): void;
}

export class ModuleFallback {
  exportsHolder: { exports: any } = { exports: null };
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  get exports() {
    return this.exportsHolder.exports;
  }
}

/**
 * @typedef {{ type: 'hmr:module-registered', modules: string[] }} DevRuntimeMessage
 * @typedef {{ send(message: DevRuntimeMessage): void }} Messenger
 */

export abstract class DevRuntimeFallback implements DevRuntime {
  modules: Record<string, ModuleFallback> = {};

  get __toESM() {
    return __toESM$;
  }

  get __toCommonJS() {
    return __toCommonJS$;
  }

  get __exportAll() {
    return __exportAll$;
  }

  get __reExport() {
    return __reExport$;
  }

  get __toDynamicImportESM() {
    return (isNodeMode: boolean) => (mod: any) => __toESM$(mod.default, isNodeMode);
  }

  constructor(public messenger: Messenger) {}

  abstract createModuleHotContext(moduleId: string): void;
  abstract applyUpdates(boundaries: [string, string][]): void;

  registerModule(id: string, exportsHolder: ModuleFallback['exportsHolder']) {
    const module = new ModuleFallback(id);
    module.exportsHolder = exportsHolder;
    this.modules[id] = module;
    this.sendModuleRegisteredMessage(id);
  }

  loadExports(id: string) {
    const module = this.modules[id];
    if (module) {
      return module.exportsHolder.exports;
    } else {
      console.warn(`Module ${id} not found`);
      return {};
    }
  }

  createEsmInitializer =
    <T>(fn: any, res: T) =>
    () => (fn && (res = fn((fn = 0))), res);

  createCjsInitializer =
    <T extends ModuleFallback['exportsHolder']>(cb: any, mod: ModuleFallback['exportsHolder']) =>
    (): T => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

  sendModuleRegisteredMessage = (() => {
    let timeout: NodeJS.Timeout | null = null;
    let timeoutSetLength = 0;
    const cache: string[] = [];

    return (module: string) => {
      if (!this.messenger) {
        return;
      }
      cache.push(module);
      if (!timeout) {
        const flushCache = () => {
          if (cache.length > timeoutSetLength) {
            timeout = setTimeout(flushCache);
            timeoutSetLength = cache.length;
            return;
          }

          this.messenger.send({
            type: 'hmr:module-registered',
            modules: cache,
          });
          cache.length = 0;
          timeout = null;
          timeoutSetLength = 0;
        };

        timeout = setTimeout(flushCache);
        timeoutSetLength = cache.length;
      }
    };
  })();
}
