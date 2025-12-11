import { createRequire } from 'node:module';
import path from 'node:path';

export function resolveReactNativePath(basePath: string) {
  const require = createRequire(import.meta.url);
  const resolvedPath = require.resolve('react-native/package.json', { paths: [basePath] });
  const reactNativePath = path.dirname(resolvedPath);

  return reactNativePath;
}
