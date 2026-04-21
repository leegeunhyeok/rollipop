import EventEmitter from 'node:events';

import type { OutputChunk } from '@rollipop/rolldown';
import * as rolldownExperimental from '@rollipop/rolldown/experimental';
import { invariant } from 'es-toolkit';

import type { ResolvedConfig } from '../config';
import { Bundler } from '../core/bundler';
import type { BuildOptions, DevEngine } from '../core/types';
import type { ReportableEvent } from '../types';
import { getBaseBundleName } from '../utils/bundle';
import { bindReporter } from '../utils/config';
import { normalizeRolldownError } from '../utils/errors';
import { taskHandler } from '../utils/promise';
import { type BundleStore, FileSystemBundleStore } from './bundle';
import { logger } from './logger';
import type { ServerOptions } from './types';

export interface DevServerOptions {
  host: string;
  port: number;
}

export interface BundlerDevEngineOptions {
  server: DevServerOptions;
}

export interface BundlerDevEngineEventMap {
  buildStart: [];
  buildDone: [];
  buildFailed: [Error];
  /**
   * @param id
   * @param totalModules
   * @param transformedModules
   */
  transform: [string, number | undefined, number];
  /**
   * @param id
   */
  watchChange: [string];
  hmrUpdates: [rolldownExperimental.BindingClientHmrUpdate[]];
}

export class BundlerDevEngine extends EventEmitter<BundlerDevEngineEventMap> {
  private readonly initializeHandle: ReturnType<typeof taskHandler>;
  private readonly isHmrEnabled: boolean;
  private readonly _id: string;
  private bundleStore: BundleStore | null = null;
  private buildFailedError: Error | null = null;
  private _devEngine: DevEngine | null = null;
  private _state: 'idle' | 'initializing' | 'ready' = 'idle';

  constructor(
    private readonly options: BundlerDevEngineOptions,
    private readonly config: ResolvedConfig,
    private readonly buildOptions: BuildOptions,
    private readonly onReporterEvent?: (id: string, event: ReportableEvent) => void,
  ) {
    super();
    this._id = Bundler.createId(config, buildOptions);
    this.initializeHandle = taskHandler();
    this.isHmrEnabled = Boolean(buildOptions.dev && config.devMode.hmr);
    void this.initialize();
  }

  get id() {
    return this._id;
  }

  get devEngine() {
    invariant(this._devEngine, 'DevEngine is not initialized');
    return this._devEngine;
  }

  get ensureInitialized() {
    return this.initializeHandle.task;
  }

  private async initialize() {
    if (this._state !== 'idle' || this._devEngine != null) {
      return this;
    }

    this._state = 'initializing';

    const onEvent = this.onReporterEvent
      ? (event: ReportableEvent) => this.onReporterEvent!(this._id, event)
      : undefined;

    const devEngine = await Bundler.devEngine(
      bindReporter(this.config, this, onEvent),
      this.buildOptions,
      {
        host: this.options.server.host,
        port: this.options.server.port,
        onHmrUpdates: (errorOrResult) => {
          if (!this.isHmrEnabled) {
            return;
          }

          if (errorOrResult instanceof Error) {
            logger.error('Failed to handle HMR updates', {
              bundlerId: this.id,
              error: errorOrResult,
            });
            const normalizedError = normalizeRolldownError(errorOrResult);
            // Route through the reporter pipeline so subscribers downstream
            // (SSE bus, custom reporters) observe `bundle_build_failed` for
            // HMR-time errors — not just full builds. `bindReporter` also
            // re-emits the local `buildFailed` event, which HMRServer uses
            // to dispatch `hmr:error` to the connected client.
            this.config.reporter?.update({
              type: 'bundle_build_failed',
              error: normalizedError,
            });
          } else {
            logger.trace('Detected changed files', {
              bundlerId: this.id,
              changedFiles: errorOrResult.changedFiles,
            });
            this.emit('hmrUpdates', errorOrResult.updates);
          }
        },
        onOutput: (errorOrResult) => {
          if (errorOrResult instanceof Error) {
            const normalizedError = normalizeRolldownError(errorOrResult);
            logger.trace('onOutput', { bundlerId: this.id });
            logger.error(errorOrResult.message);
            this.buildFailedError = normalizedError;
            this.emit('buildFailed', normalizedError);
          } else {
            const output = errorOrResult.output[0];
            this.updateBundleStore(output);
            this.buildFailedError = null;
            logger.debug('Build completed', {
              bundlerId: this.id,
              bundleName: output.name,
            });
          }
        },
        rebuildStrategy: 'auto',
      },
    );

    await devEngine.run();
    this._devEngine = devEngine;
    this._state = 'ready';
    this.initializeHandle.resolve();
  }

  private updateBundleStore(output: OutputChunk) {
    this.bundleStore = new FileSystemBundleStore(
      this.config.root,
      this.id,
      output.code,
      output.map?.toString(),
    );
  }

  async getBundle() {
    await this.ensureInitialized;

    const state = await this.devEngine.getBundleState();
    logger.debug('Bundle state', { bundlerId: this.id, state });
    if (state.lastFullBuildFailed) {
      throw new Error(this.buildFailedError?.message ?? 'Build failed');
    }
    if (state.hasStaleOutput || this.bundleStore == null) {
      await this.devEngine.ensureLatestBuildOutput();
    }
    invariant(this.bundleStore, 'Bundle is not available');

    return this.bundleStore;
  }
}

export class BundlerPool {
  private static readonly instances: Map<string, BundlerDevEngine> = new Map();

  constructor(
    private readonly config: ResolvedConfig,
    private readonly resolvedServerOptions: Required<Pick<ServerOptions, 'host' | 'port'>>,
    private readonly onReporterEvent?: (id: string, event: ReportableEvent) => void,
  ) {}

  private instanceKey(bundleName: string, buildOptions: BuildOptions) {
    const id = Bundler.createId(this.config, buildOptions);
    return `${bundleName}-${id}`;
  }

  get(bundleName: string, buildOptions: Pick<BuildOptions, 'platform' | 'dev'>) {
    const key = this.instanceKey(getBaseBundleName(bundleName), buildOptions);
    const instance = BundlerPool.instances.get(key);

    if (instance) {
      return instance;
    } else {
      logger.debug('Preparing new bundler instance', { bundleName, key });
      const instance = new BundlerDevEngine(
        {
          server: this.resolvedServerOptions,
        },
        this.config,
        buildOptions,
        this.onReporterEvent,
      );
      logger.debug('Setting new bundler instance', { key });
      BundlerPool.instances.set(key, instance);

      return instance;
    }
  }
}
