import fs from 'node:fs';
import path from 'node:path';

import { logger } from '@rollipop/common';

import type { Cache } from './cache';

type Key = string;

export class FileSystemCache implements Cache<Key, string> {
  constructor(private readonly cacheDirectory: string) {
    this.ensureCacheDirectory();
    logger.debug('cache directory:', cacheDirectory);
  }

  private ensureCacheDirectory() {
    if (!fs.existsSync(this.cacheDirectory)) {
      fs.mkdirSync(this.cacheDirectory, { recursive: true });
    }
  }

  get(key: Key): string | undefined {
    try {
      return fs.readFileSync(path.join(this.cacheDirectory, key), 'utf-8');
    } catch {
      return undefined;
    }
  }

  set(key: Key, value: string) {
    try {
      fs.writeFileSync(path.join(this.cacheDirectory, key), value);
    } catch {
      logger.error('Failed to write cache file', key);
    }
  }

  clear() {
    fs.rmSync(this.cacheDirectory, { recursive: true, force: true });
    this.ensureCacheDirectory();
  }
}
