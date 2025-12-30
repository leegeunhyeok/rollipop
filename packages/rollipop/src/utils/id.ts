import { pick } from 'es-toolkit';

import type { ResolvedConfig } from '../config';
import { ROLLIPOP_VERSION } from '../constants';
import type { BuildOptions } from '../core/types';
import { md5 } from './hash';
import { serialize } from './serialize';

export function createId(config: ResolvedConfig, buildOptions: BuildOptions) {
  return md5(
    serialize([
      ROLLIPOP_VERSION,
      filterTransformAffectedOptions(buildOptions),
      filterTransformAffectedConfig(config),
    ]),
  );
}

function filterTransformAffectedOptions(buildOptions: BuildOptions) {
  return pick(buildOptions, ['platform', 'dev']);
}

function filterTransformAffectedConfig(config: ResolvedConfig) {
  const { transformer, plugins = [] } = config;
  return {
    transformer,
    plugins: plugins.map((plugin, index) => `${plugin.name}#${index}`),
  };
}
