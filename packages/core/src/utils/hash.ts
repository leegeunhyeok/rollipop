import crypto from 'node:crypto';

import { xxh32 } from '@node-rs/xxhash';

export function xxhash(data: string) {
  return xxh32(data).toString(16);
}

export function md5(data: string) {
  return crypto.createHash('md5').update(data).digest('hex');
}
