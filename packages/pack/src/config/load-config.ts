import { getInitializeCorePath, getPolyfillScriptPaths } from 'src/internal/react-native';
import type { Config } from './types';
import { resolveReactNativePath } from 'src/utils/resolve-react-native-path';

export function loadConfig(basePath: string): Config {
  const reactNativePath = resolveReactNativePath(basePath);

  // TODO
  return {
    root: basePath,
    entry: 'index.js',
    serializer: {
      prelude: [getInitializeCorePath(basePath)],
      polyfills: [...getPolyfillScriptPaths(reactNativePath)],
    },
  };
}
