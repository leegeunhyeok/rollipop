import fs from 'node:fs';
import path from 'node:path';

import { merge } from 'es-toolkit';

import { getSharedDataPath } from './fs';
import { FileStorageData } from './types';

const DEFAULT_DATA: FileStorageData = {
  build: {},
};

export class FileStorage {
  private static instance: FileStorage | null = null;
  private dataFilePath: string;
  private data: FileStorageData;

  static getInstance(basePath: string) {
    if (FileStorage.instance == null) {
      FileStorage.instance = new FileStorage(basePath);
    }
    return new FileStorage(basePath);
  }

  private constructor(private readonly basePath: string) {
    this.dataFilePath = path.join(getSharedDataPath(basePath), 'rollipop.json');

    if (fs.existsSync(this.dataFilePath)) {
      this.data = JSON.parse(fs.readFileSync(this.dataFilePath, 'utf-8'));
    } else {
      this.data = DEFAULT_DATA;
    }
  }

  get() {
    return this.data;
  }

  set(data: Partial<FileStorageData>) {
    this.data = merge(this.data, data);
    fs.writeFileSync(this.dataFilePath, JSON.stringify(this.data, null, 2));
  }
}
