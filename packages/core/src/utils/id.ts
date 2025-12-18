import { pick } from 'es-toolkit';

import type { ResolvedConfig } from '../config';
import { ROLLIPOP_VERSION } from '../constants';
import type { BuildOptions } from '../core/types';
import { md5 } from './hash';
import { serialize } from './serialize';

export function getId(config: ResolvedConfig, buildOptions: BuildOptions) {
  return md5(
    serialize([
      ROLLIPOP_VERSION,
      pick(buildOptions, ['platform', 'dev']),
      config.resolver,
      config.transformer,
      config.plugins,
      config.serializer.prelude,
    ]),
  );
}
