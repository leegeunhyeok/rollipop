import { invariant } from 'es-toolkit';
import {
  SourceMapConsumer,
  type BasicSourceMapConsumer,
  type IndexedSourceMapConsumer,
} from 'source-map';

import { replaceSourceMappingURL } from '../utils/source-map';

type SourceMapConsumerType = BasicSourceMapConsumer | IndexedSourceMapConsumer;

export class InMemoryBundle {
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
