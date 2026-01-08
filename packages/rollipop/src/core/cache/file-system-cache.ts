import fs from 'node:fs';
import path from 'node:path';

import pLimit from 'p-limit';

import { logger } from '../../logger';
import { getSharedDataPath } from '../fs/data';
import type { Cache } from './cache';

type Key = string;

export class FileSystemCache implements Cache<Key, string> {
  private pendingData: Map<Key, string> = new Map();
  private readonly cacheDirectory: string;

  static getCacheDirectory(projectRoot: string) {
    return path.join(getSharedDataPath(projectRoot), 'cache');
  }

  static clearAll(projectRoot: string) {
    fs.rmSync(FileSystemCache.getCacheDirectory(projectRoot), { recursive: true, force: true });
  }

  constructor(projectRoot: string, id: string) {
    this.cacheDirectory = path.join(FileSystemCache.getCacheDirectory(projectRoot), id);
    this.ensureCacheDirectory(this.cacheDirectory);
    logger.debug('cache directory:', this.cacheDirectory);
  }

  private ensureCacheDirectory(cacheDirectory: string) {
    if (!fs.existsSync(cacheDirectory)) {
      fs.mkdirSync(cacheDirectory, { recursive: true });
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
    this.pendingData.set(key, value);
  }

  async flush() {
    const limit = pLimit(
      process.env.ROLLIPOP_CACHE_FLUSH_LIMIT
        ? parseInt(process.env.ROLLIPOP_CACHE_FLUSH_LIMIT)
        : 20,
    );
    const entries = Array.from(this.pendingData.entries());

    await Promise.all(
      entries.map(([key, value]) =>
        limit(async () => {
          try {
            await fs.promises.writeFile(path.join(this.cacheDirectory, key), value);
          } catch (error) {
            logger.error('Failed to write cache file', key);
            logger.debug(error);
          }
        }),
      ),
    ).catch((error) => {
      logger.error('Failed to flush cache', error);
    });

    this.pendingData.clear();
  }

  clear() {
    fs.rmSync(this.cacheDirectory, { recursive: true, force: true });
    this.ensureCacheDirectory(this.cacheDirectory);
  }
}
