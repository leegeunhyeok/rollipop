import fs from 'node:fs';
import path from 'node:path';

import { invariant } from 'es-toolkit';
import {
  SourceMapConsumer,
  type BasicSourceMapConsumer,
  type IndexedSourceMapConsumer,
} from 'source-map';

import { getSharedDataPath } from '../core/fs/data';
import { logger } from '../logger';
import { replaceSourceMappingURL } from '../utils/source-map';

type SourceMapConsumerType = BasicSourceMapConsumer | IndexedSourceMapConsumer;

export interface Bundle {
  code: string;
  sourceMap: string | undefined;
  sourceMapConsumer: Promise<SourceMapConsumerType> | undefined;
}

export class InMemoryBundle implements Bundle {
  private lazySourceMapConsumer: Promise<SourceMapConsumerType> | null = null;

  constructor(
    private readonly _code: string,
    private readonly _sourceMap: string | undefined,
    sourceMappingURL: string,
  ) {
    this._code = replaceSourceMappingURL(this._code, sourceMappingURL);
  }

  get code() {
    return this._code;
  }

  get sourceMap() {
    return this._sourceMap;
  }

  get sourceMapConsumer() {
    invariant(this._sourceMap, 'Source map is not available');

    if (this.lazySourceMapConsumer == null) {
      this.lazySourceMapConsumer = new SourceMapConsumer(this._sourceMap);
    }

    return this.lazySourceMapConsumer;
  }
}

export class FileSystemBundle implements Bundle {
  private readonly bundleFilePath: string;
  private holder: { code: string; mtimeMs: number };

  constructor(projectRoot: string, id: string, code: string) {
    const sharedDataPath = getSharedDataPath(projectRoot);
    const bundlesPath = path.join(sharedDataPath, 'bundles');
    const bundleFilePath = path.join(bundlesPath, `${id}.bundle`);

    if (!fs.existsSync(bundlesPath)) {
      fs.mkdirSync(bundlesPath, { recursive: true });
    }

    fs.writeFileSync(bundleFilePath, code, { encoding: 'utf-8' });
    const stats = fs.statSync(bundleFilePath);

    this.bundleFilePath = bundleFilePath;
    this.holder = {
      code,
      mtimeMs: stats.mtimeMs,
    };

    logger.info(`File system bundle created at ${bundleFilePath}`);
  }

  private update() {
    const code = fs.readFileSync(this.bundleFilePath, { encoding: 'utf-8' });
    const stats = fs.statSync(this.bundleFilePath);
    this.holder = {
      code,
      mtimeMs: stats.mtimeMs,
    };
  }

  get code() {
    if (this.isStale()) {
      logger.info('File system bundle is stale, updating...');
      this.update();
    } else {
      logger.trace('File system bundle is up to date');
    }
    return this.holder.code;
  }

  get sourceMap() {
    // FileSystem bundle can be modified. so, we can't return the source map.
    return undefined;
  }

  get sourceMapConsumer() {
    // FileSystem bundle can be modified. so, we can't return the source map consumer.
    return undefined;
  }

  isStale() {
    return this.holder.mtimeMs !== fs.statSync(this.bundleFilePath).mtimeMs;
  }
}
