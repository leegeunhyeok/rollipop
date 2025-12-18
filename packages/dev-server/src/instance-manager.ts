import EventEmitter from 'node:events';

import {
  type BuildOptions,
  type ResolvedConfig,
  Bundler,
  rolldownExperimental,
} from '@rollipop/core';
import { invariant } from 'es-toolkit';

import { logger } from './logger';
import { ServerOptions } from './types';
import { getBaseBundleName } from './utils/bundle';
import { taskHandler } from './utils/promise';
import { replaceSourceMappingURL } from './utils/source-map';

interface BuildResultHolder {
  bundle?: string;
  sourceMap?: string;
}

export interface DevServerOptions {
  host: string;
  port: number;
}

export interface BundlerDevEngineOptions {
  server: DevServerOptions;
}

export interface BundlerDevEngineEventMap {
  hmrUpdates: [rolldownExperimental.BindingClientHmrUpdate[]];
}

export class BundlerDevEngine extends EventEmitter<BundlerDevEngineEventMap> {
  private readonly buildResultHolder: BuildResultHolder = {};
  private readonly bundler: Bundler;
  private readonly initializeHandle: ReturnType<typeof taskHandler>;
  private _devEngine: rolldownExperimental.DevEngine | null = null;
  private _state: 'idle' | 'initializing' | 'ready' = 'idle';

  constructor(
    private readonly options: BundlerDevEngineOptions,
    private readonly config: ResolvedConfig,
    private readonly buildOptions: BuildOptions,
  ) {
    super();
    this.bundler = new Bundler(config, buildOptions);
    this.initializeHandle = taskHandler();
    void this.initialize();
  }

  get id() {
    return this.bundler.id;
  }

  get devEngine() {
    invariant(this._devEngine, 'DevEngine is not initialized');
    return this._devEngine;
  }

  get ensureInitialized() {
    return this.initializeHandle.task;
  }

  get sourceMappingURL() {
    const { host, port } = this.options.server;
    const { platform, dev } = this.buildOptions;
    const [name] = this.config.entry.split('.');

    return `http://${host}:${port}/${name}.bundle.map?platform=${platform}&dev=${dev}`;
  }

  private async initialize() {
    if (this._state !== 'idle' || this._devEngine != null) {
      return this;
    }

    this._state = 'initializing';

    const devEngine = await this.bundler.devEngine({
      host: this.options.server.host,
      port: this.options.server.port,
      onHmrUpdates: (errorOrResult) => {
        if (errorOrResult instanceof Error) {
          logger.error('Failed to handle HMR updates', {
            bundlerId: this.id,
            error: errorOrResult,
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
          logger.error('Failed to build bundle', {
            bundlerId: this.id,
            error: errorOrResult,
          });
        } else {
          const output = errorOrResult.output[0];
          this.buildResultHolder.bundle = replaceSourceMappingURL(
            output.code,
            this.sourceMappingURL,
          );
          this.buildResultHolder.sourceMap = output.map?.toString();
          logger.debug('Build completed', {
            bundlerId: this.id,
            bundleName: output.name,
          });
        }
      },
      rebuildStrategy: 'auto',
      watch: this.config.watcher,
    });

    await devEngine.run();
    this._devEngine = devEngine;
    this._state = 'ready';
    this.initializeHandle.resolve();
  }

  async getBundle() {
    await this.ensureInitialized;
    const state = await this.devEngine.getBundleState();
    if (state.hasStaleOutput || this.buildResultHolder.bundle == null) {
      await this.devEngine.ensureLatestBuildOutput();
    }

    invariant(this.buildResultHolder.bundle, 'Bundle is not available');

    return this.buildResultHolder.bundle;
  }

  async getSourceMap() {
    await this.ensureInitialized;
    const state = await this.devEngine.getBundleState();
    if (state.hasStaleOutput || this.buildResultHolder.sourceMap == null) {
      await this.devEngine.ensureLatestBuildOutput();
    }
    invariant(this.buildResultHolder.sourceMap, 'Source map is not available');

    return this.buildResultHolder.sourceMap;
  }
}

export class InstanceManager {
  private static readonly INSTANCES: Map<string, BundlerDevEngine> = new Map();

  constructor(
    private readonly config: ResolvedConfig,
    private readonly resolvedServerOptions: Required<Pick<ServerOptions, 'host' | 'port'>>,
  ) {}

  private instanceKey(bundleName: string, buildOptions: BuildOptions) {
    const id = Bundler.getId(this.config, buildOptions);
    return `${bundleName}-${id}`;
  }

  get(bundleName: string, buildOptions: Pick<BuildOptions, 'platform' | 'dev'>) {
    const key = this.instanceKey(getBaseBundleName(bundleName), buildOptions);
    const instance = InstanceManager.INSTANCES.get(key);

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
      );
      logger.debug('Setting new bundler instance', { key });
      InstanceManager.INSTANCES.set(key, instance);

      return instance;
    }
  }
}
