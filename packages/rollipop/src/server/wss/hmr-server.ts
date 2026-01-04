import { invariant } from 'es-toolkit';
import type * as rolldownExperimental from 'rolldown/experimental';
import type * as ws from 'ws';

import type { ReportableEvent } from '../../types';
import type {
  HMRClientMessage,
  HMRCustomMessage,
  HMRServerError,
  HMRServerMessage,
} from '../../types/hmr';
import type { BundlerDevEngine, BundlerPool } from '../bundler-pool';
import { type WebSocketClient, WebSocketServer } from './server';

export interface HMRServerOptions {
  bundlerPool: BundlerPool;
  reportEvent: (event: ReportableEvent) => void;
}

interface Bindings {
  hmrUpdates: (updates: rolldownExperimental.BindingClientHmrUpdate[]) => void;
  watchChange: () => void;
}

export class HMRServer extends WebSocketServer {
  private bundlerPool: BundlerPool;
  private reportEvent: HMRServerOptions['reportEvent'];
  private instances: Map<number, BundlerDevEngine> = new Map();
  private bindings: Map<number, Bindings> = new Map();

  constructor({ bundlerPool, reportEvent }: HMRServerOptions) {
    super('hmr', { noServer: true });
    this.bundlerPool = bundlerPool;
    this.reportEvent = reportEvent;
  }

  private parseClientMessage(data: ws.RawData) {
    const parsedData = JSON.parse(this.rawDataToString(data));
    const clientMessage = 'type' in parsedData ? (parsedData as HMRClientMessage) : null;
    invariant(clientMessage, 'Invalid HMR client message');

    return clientMessage;
  }

  private async handleConnected(client: WebSocketClient, platform: string, bundleEntry: string) {
    try {
      this.logger.trace(`HMR client connected (clientId: ${client.id})`, { platform, bundleEntry });
      const devEngineInstance = this.bundlerPool.get(bundleEntry, {
        platform,
        dev: true,
      });

      this.bindEvents(client, devEngineInstance);
      this.instances.set(client.id, devEngineInstance);
      this.logger.trace(`Bundler instance prepared (bundlerId: ${devEngineInstance.id})`);
    } catch (error) {
      this.logger.error(`Failed to prepare bundler instance`, error);
    }
  }

  private bindEvents(client: WebSocketClient, instance: BundlerDevEngine) {
    const existingBindings = this.bindings.get(client.id);

    if (existingBindings == null) {
      const handleHmrUpdates = (updates: rolldownExperimental.BindingClientHmrUpdate[]) => {
        void this.handleUpdates(client, updates);
      };

      const handleWatchChange = () => {
        this.send(client, JSON.stringify({ type: 'hmr:update-start' }));
      };

      instance.addListener('hmrUpdates', handleHmrUpdates);
      instance.addListener('watchChange', handleWatchChange);
      this.bindings.set(client.id, {
        hmrUpdates: handleHmrUpdates,
        watchChange: handleWatchChange,
      });
      this.logger.trace(`HMR event binding established (clientId: ${client.id})`);
    }
  }

  private async handleModuleRegistered(client: WebSocketClient, modules: string[]) {
    try {
      const instance = this.instances.get(client.id);
      invariant(instance != null, `Bundler instance not found for client clientId: ${client.id}`);

      await instance.ensureInitialized;
      await instance.devEngine.registerModules(client.id.toString(), modules);
    } catch (error) {
      this.logger.error(`Failed to handle module registered`, error);
    }
  }

  private async handleInvalidate(client: WebSocketClient, moduleId: string) {
    try {
      const instance = this.instances.get(client.id);
      invariant(instance != null, `Bundler instance not found for client clientId: ${client.id}`);

      await instance.ensureInitialized;
      const updates = await instance.devEngine.invalidate(moduleId);
      await this.handleUpdates(client, updates);
    } catch (error) {
      this.logger.error(`Failed to handle invalidate`, error);
    }
  }

  private async handleUpdates(
    client: WebSocketClient,
    updates: rolldownExperimental.BindingClientHmrUpdate[],
  ) {
    this.logger.trace(`HMR updates found (clientId: ${client.id})`, {
      updatesCount: updates.length,
    });

    for (const clientUpdate of updates) {
      const update = clientUpdate.update;
      switch (update.type) {
        case 'Patch':
          this.sendUpdateToClient(client, update);
          break;

        case 'FullReload':
          this.sendReloadToClient(client);
          break;

        case 'Noop':
          this.logger.warn(`Client ${clientUpdate.clientId} received noop update`);
          break;
      }
    }
  }

  private sendUpdateToClient(
    client: WebSocketClient,
    update: rolldownExperimental.BindingClientHmrUpdate['update'],
  ) {
    invariant(update.type === 'Patch', 'Invalid HMR update type');

    const updateMessage = {
      type: 'hmr:update',
      code: update.code,
    } satisfies HMRServerMessage;

    this.send(client, JSON.stringify(updateMessage));
    this.send(client, JSON.stringify({ type: 'hmr:update-done' }));
    this.done(client);
  }

  private sendReloadToClient(client: WebSocketClient) {
    this.logger.trace(`Sending HMR reload message to client (clientId: ${client.id})`);
    const reloadMessage = {
      type: 'hmr:reload',
    } satisfies HMRServerMessage;

    this.send(client, JSON.stringify(reloadMessage));
    this.done(client);
  }

  private done(client: WebSocketClient) {
    const updateDoneMessage = {
      type: 'hmr:update-done',
    } satisfies HMRServerMessage;
    this.send(client, JSON.stringify(updateDoneMessage));
  }

  private sendError(client: WebSocketClient, error: HMRServerError) {
    try {
      this.send(client, JSON.stringify(error));
    } catch (error) {
      this.logger.error(
        `Failed to send HMR error message to client (clientId: ${client.id})`,
        error,
      );
    }
  }

  private cleanup(client: WebSocketClient) {
    this.logger.trace(`HMR client cleanup (clientId: ${client.id})`);
    const binding = this.bindings.get(client.id);
    const instance = this.instances.get(client.id);

    if (binding != null && instance != null) {
      instance.removeListener('hmrUpdates', binding.hmrUpdates);
      instance.removeListener('watchChange', binding.watchChange);
    }

    if (instance != null) {
      void instance.devEngine.removeClient(String(client.id));
    }

    this.bindings.delete(client.id);
    this.instances.delete(client.id);
  }

  protected onMessage(client: WebSocketClient, data: ws.RawData): void {
    let message: HMRClientMessage;

    try {
      message = this.parseClientMessage(data);
      this.logger.trace(
        'HMR client message received',
        message.type === 'hmr:module-registered'
          ? { ...message, modules: `[${message.modules.length} modules]` }
          : message,
      );
    } catch (error) {
      const message = 'Failed to parse HMR client message';
      this.logger.error(message, error);
      this.sendError(client, {
        type: 'InternalError',
        errors: [{ description: error instanceof Error ? error.message : String(error) }],
        message,
      });
      return;
    }

    if (isCustomHMRMessage(message)) {
      this.wss.emit(message.type, message.payload);
      return;
    }

    switch (message.type) {
      case 'hmr:connected':
        void this.handleConnected(client, message.platform, message.bundleEntry);
        break;

      case 'hmr:module-registered':
        void this.handleModuleRegistered(client, message.modules);
        break;

      case 'hmr:invalidate':
        void this.handleInvalidate(client, message.moduleId);
        break;

      case 'hmr:log':
        this.reportEvent({
          type: 'client_log',
          level: message.level,
          data: message.data,
        });
        break;
    }
  }

  protected onConnection(client: WebSocketClient): void {
    this.logger.trace(`connection established (clientId: ${client.id})`);
  }

  protected onError(client: WebSocketClient, error: Error): void {
    this.logger.error(`connection error (clientId: ${client.id})`, error);
    this.cleanup(client);
  }

  protected onClose(client: WebSocketClient): void {
    this.logger.trace(`connection closed (clientId: ${client.id})`);
    this.cleanup(client);
  }
}

function isCustomHMRMessage(message: unknown): message is HMRCustomMessage {
  if (typeof message !== 'object' || message == null) {
    return false;
  }

  if ('type' in message && typeof message.type === 'string' && message.type.startsWith('hmr:')) {
    return false;
  }

  return true;
}
