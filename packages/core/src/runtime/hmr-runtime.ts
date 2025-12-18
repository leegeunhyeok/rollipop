import type { HMRClientMessage, HMRServerMessage } from '../types/hmr';
import { enqueueUpdate, isReactRefreshBoundary } from './react-refresh-utils';

interface Messenger {
  send(message: HMRClientMessage): void;
}

interface Module {
  (id: string): Module;
  id: string;
  exportsHolder: { exports: any };
  exports: any;
}

declare global {
  var __rolldown_runtime__: ReactNativeDevRuntime;
  var __turboModuleProxy: (moduleName: string) => any;
  var globalEvalWithSourceUrl: (code: string, sourceURL?: string) => void;
  var nativeModuleProxy: Record<string, any>;
  var __ReactRefresh: any;
}

declare class DevRuntime {
  constructor(messenger: Messenger);
  modules: Record<string, Module>;
  createModuleHotContext(moduleId: string): void;
  applyUpdates(boundaries: [string, string][]): void;
  registerModule(id: string, exportsHolder: Module['exportsHolder']): void;
  loadExports(id: string): void;
}

var BaseDevRuntime = DevRuntime;

class ModuleHotContext {
  acceptCallbacks: { deps: string[]; fn: (moduleExports: Record<string, any>[]) => void }[] = [];

  constructor(
    private moduleId: string,
    private devRuntime: InstanceType<typeof DevRuntime>,
  ) {}

  get refresh() {
    return globalThis.__ReactRefresh;
  }

  get refreshUtils() {
    return {
      isReactRefreshBoundary,
      enqueueUpdate,
    };
  }

  accept(...args: any[]) {
    if (args.length === 1) {
      const [cb] = args;
      const acceptingPath = this.moduleId;
      this.acceptCallbacks.push({
        deps: [acceptingPath],
        fn: cb,
      });
    } else if (args.length === 0) {
      // noop
    } else {
      throw new Error('Invalid arguments for `import.meta.hot.accept`');
    }
  }

  invalidate() {
    if (
      ReactNativeDevRuntime.socket == null ||
      ReactNativeDevRuntime.socket.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    ReactNativeDevRuntime.socket.send(
      JSON.stringify({
        type: 'hmr:invalidate',
        moduleId: this.moduleId,
      }),
    );
  }
}

class ReactNativeDevRuntime extends BaseDevRuntime {
  static socket: WebSocket | null = null;
  static readonly queuedMessages: string[] = [];

  moduleHotContexts = new Map<string, ModuleHotContext>();
  moduleHotContextsToBeUpdated = new Map<string, ModuleHotContext>();

  constructor() {
    const messenger: Messenger = {
      send(message) {
        if (
          ReactNativeDevRuntime.socket === null ||
          ReactNativeDevRuntime.socket.readyState !== WebSocket.OPEN
        ) {
          ReactNativeDevRuntime.queuedMessages.push(JSON.stringify(message));
          return;
        }
        ReactNativeDevRuntime.socket.send(JSON.stringify(message));
      },
    };
    super(messenger);
  }

  createModuleHotContext(moduleId: string) {
    const hotContext = new ModuleHotContext(moduleId, this);
    if (this.moduleHotContexts.has(moduleId)) {
      this.moduleHotContextsToBeUpdated.set(moduleId, hotContext);
    } else {
      this.moduleHotContexts.set(moduleId, hotContext);
    }
    return hotContext;
  }

  applyUpdates(boundaries: [string, string][]) {
    for (let [moduleId, _acceptedVia] of boundaries) {
      const hotContext = this.moduleHotContexts.get(moduleId);
      if (hotContext) {
        const acceptCallbacks = hotContext.acceptCallbacks;
        acceptCallbacks.filter((cb) => {
          cb.fn(this.modules[moduleId].exports);
        });
      }
    }
    this.moduleHotContextsToBeUpdated.forEach((hotContext, moduleId) => {
      this.moduleHotContexts.set(moduleId, hotContext);
    });
    this.moduleHotContextsToBeUpdated.clear();
  }

  setup(socket: WebSocket) {
    if (ReactNativeDevRuntime.socket != null) {
      console.warn('[HMR]: ReactNativeDevRuntime already setup');
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) {
      socket.addEventListener('open', () => {
        this.flushQueuedMessages(socket);
      });
    } else {
      this.flushQueuedMessages(socket);
    }

    socket.addEventListener('message', (event: MessageEvent) => {
      const message = JSON.parse(event.data) as HMRServerMessage;

      switch (message.type) {
        case 'hmr:update':
          this.evaluate(message.code);
          break;

        case 'hmr:reload':
          this.reload();
          break;
      }
    });

    ReactNativeDevRuntime.socket = socket;
  }

  private flushQueuedMessages(socket: WebSocket) {
    for (const message of ReactNativeDevRuntime.queuedMessages) {
      socket.send(message);
    }
    ReactNativeDevRuntime.queuedMessages.length = 0;
  }

  private evaluate(code: string, sourceURL?: string) {
    if (globalThis.globalEvalWithSourceUrl) {
      globalThis.globalEvalWithSourceUrl(code, sourceURL);
    } else {
      // oxlint-disable-next-line no-eval
      eval(code);
    }
  }

  private reload() {
    const moduleName = 'DevSettings';
    (globalThis.__turboModuleProxy
      ? globalThis.__turboModuleProxy(moduleName)
      : globalThis.nativeModuleProxy[moduleName]
    ).reload();
  }
}

globalThis.__rolldown_runtime__ = new ReactNativeDevRuntime();

export type { DevRuntime };
