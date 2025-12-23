import path from 'node:path';

export function getAssetPath() {
  return path.join(import.meta.dirname, 'assets');
}
