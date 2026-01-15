export interface HMRContext {
  accept(...args: any[]): void;
  invalidate(): void;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  send(type: string, payload?: unknown): void;
}

export type HMRClientLogLevel =
  | 'trace'
  | 'info'
  | 'warn'
  | 'error'
  | 'log'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'debug';

export type HMRClientMessage =
  | {
      type: 'hmr:connected';
      bundleEntry: string;
      platform: string;
    }
  | {
      type: 'hmr:module-registered';
      modules: string[];
    }
  | {
      type: 'hmr:log';
      level: HMRClientLogLevel;
      data: any[];
    }
  | {
      type: 'hmr:invalidate';
      moduleId: string;
    };

export type HMRServerMessage =
  | {
      type: 'hmr:update-start';
    }
  | {
      type: 'hmr:update-done';
    }
  | {
      type: 'hmr:update';
      code: string;
    }
  | {
      type: 'hmr:reload';
    }
  | {
      type: 'hmr:error';
      payload: HMRServerError;
    };

export type HMRCustomMessage = {
  type: string;
  payload: unknown;
};

export type HMRCustomHandler = (socket: WebSocket, message: HMRCustomMessage) => void;

export interface HMRServerError {
  type: string;
  message: string;
  errors: { description: string }[];
}

export interface DevRuntimeModule {
  exportsHolder: { exports: any };
  id: string;
  exports: any;
}

export interface DevRuntimeInterface {
  modules: Record<string, DevRuntimeModule>;
  createModuleHotContext(moduleId: string): void;
  applyUpdates(boundaries: [string, string][]): void;
  registerModule(id: string, exportsHolder: DevRuntimeModule['exportsHolder']): void;
  loadExports(id: string): void;
}

class DevRuntime implements DevRuntimeInterface {
  // oxlint-disable-next-line no-unused-vars
  constructor(messenger: DevRuntimeMessenger) {}
  modules: Record<string, DevRuntimeModule> = {};
  // oxlint-disable-next-line no-unused-vars
  createModuleHotContext(moduleId: string): void {
    throw new Error('createModuleHotContext should be implemented');
  }
  // oxlint-disable-next-line no-unused-vars
  applyUpdates(boundaries: [string, string][]): void {
    throw new Error('applyUpdates should be implemented');
  }
  // oxlint-disable-next-line no-unused-vars
  registerModule(id: string, exportsHolder: DevRuntimeModule['exportsHolder']): void {
    throw new Error('registerModule should be implemented');
  }
  // oxlint-disable-next-line no-unused-vars
  loadExports(id: string): void {
    throw new Error('loadExports should be implemented');
  }
}

export type { DevRuntime };

export interface DevRuntimeMessenger {
  send(message: HMRClientMessage): void;
}
