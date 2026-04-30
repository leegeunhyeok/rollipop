import type { RollipopReactNativeRuntimeTarget } from '@rollipop/rolldown/experimental';

import type { Config } from '../config';

export function resolveRuntimeTarget(
  target: Config['runtimeTarget'],
): RollipopReactNativeRuntimeTarget {
  switch (target) {
    case 'hermes':
      return 'Hermes';
    case 'hermes-v1':
    default:
      return 'HermesV1';
  }
}
