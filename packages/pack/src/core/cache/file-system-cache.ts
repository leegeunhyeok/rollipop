import fs from 'node:fs';
import path from 'node:path';

import type { Cache } from './cache';

type Key = string;

export class FileSystemCache implements Cache<Key, string> {
  constructor(private readonly cacheDirectory: string) {
    this.ensureCacheDirectory();
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
      throw new Error('Failed to write cache file');
    }
  }

  clear() {
    fs.rmSync(this.cacheDirectory, { recursive: true, force: true });
    this.ensureCacheDirectory();
  }
}
