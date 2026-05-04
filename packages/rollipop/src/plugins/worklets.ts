import * as fs from 'node:fs';

import { rollipopWorkletsPlugin } from '@rollipop/rolldown/experimental';
import { invariant } from 'es-toolkit';

import type { PluginOption } from '../config';
import type { Plugin } from '../core/plugins/types';
import { logger } from './logger';

export function worklets(): PluginOption {
  const builtinPlugin = rollipopWorkletsPlugin({
    root: '/',
    pluginVersion: '0.0.0',
    isRelease: false,
  });

  const pluginInitializer: Plugin = {
    name: 'rollipop:worklets:plugin-initializer',
    configResolved(config) {
      builtinPlugin._options = {
        root: config.root,
        isRelease: config.mode === 'production',
        pluginVersion: resolveReactNativeWorkletsVersion(config.root),
      };
      logger.debug('[worklets] builtin plugin', builtinPlugin);
    },
  };

  return [pluginInitializer, builtinPlugin];
}

function resolveReactNativeWorkletsVersion(projectRoot: string): string {
  const packageJsonPath = require.resolve('react-native-worklets/package.json', {
    paths: [projectRoot],
  });
  const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  invariant(version, 'could not find version in react-native-worklets package.json');
  return version;
}
