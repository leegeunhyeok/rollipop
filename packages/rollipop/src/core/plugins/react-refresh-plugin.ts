import { invariant } from 'es-toolkit';
import type * as rolldown from 'rolldown';
import { transformSync } from 'rolldown/experimental';

import { GLOBAL_IDENTIFIER } from '../../constants';
import { getFlag, TransformFlag } from './utils/transform-flags';

const DEFAULT_INCLUDE_REGEX = /\.[tj]sx?(?:$|\?)/;
const DEFAULT_EXCLUDE_REGEX = /\/node_modules\//;

const HAS_REFRESH_REGEX = /\$RefreshReg\$\(/;
const ONLY_REACT_COMPONENT_REGEX = /extends\s+(?:React\.)?(?:Pure)?Component/;

export interface ReactRefreshPluginOptions {
  include?: RegExp | string;
  exclude?: RegExp | string;
}

function reactRefreshPlugin(options?: ReactRefreshPluginOptions): rolldown.Plugin[] {
  const { include = DEFAULT_INCLUDE_REGEX, exclude = DEFAULT_EXCLUDE_REGEX } = options ?? {};

  const reactRefreshTransform: rolldown.Plugin = {
    name: 'rollipop:transform-react-refresh',
    transform: {
      filter: {
        id: {
          include,
          exclude,
        },
      },
      handler(code, id) {
        if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
          return;
        }

        const result = transformSync(id, code, {
          sourcemap: true,
          jsx: {
            runtime: 'automatic',
            development: true,
            refresh: {
              refreshReg: `${GLOBAL_IDENTIFIER}.$RefreshReg$`,
              refreshSig: `${GLOBAL_IDENTIFIER}.$RefreshSig$`,
            },
          },
        });

        return { code: result.code, map: result.map };
      },
    },
  };

  const reactRefreshBoundary: rolldown.Plugin = {
    name: 'rollipop:react-refresh-boundary',
    transform: {
      filter: {
        id: {
          include,
          exclude,
        },
      },
      handler(code, id, meta) {
        if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
          return;
        }

        const { magicString } = meta;
        invariant(magicString != null, 'magicString is not available');

        applyRefreshWrapper(magicString, {
          id,
          hasRefresh: HAS_REFRESH_REGEX.test(code),
          onlyReactComponent: ONLY_REACT_COMPONENT_REGEX.test(code),
        });

        return { code: magicString };
      },
    },
  };

  return [reactRefreshTransform, reactRefreshBoundary];
}

interface ApplyRefreshWrapperOptions {
  id: string;
  hasRefresh: boolean;
  onlyReactComponent: boolean;
}

export function applyRefreshWrapper(
  s: rolldown.BindingMagicString,
  options: ApplyRefreshWrapperOptions,
) {
  const { id, hasRefresh, onlyReactComponent } = options;

  if (!(hasRefresh || onlyReactComponent)) {
    return;
  }

  if (hasRefresh) {
    s.prepend(`
var __prev$RefreshReg$ = global.$RefreshReg$;
var __prev$RefreshSig$ = global.$RefreshSig$;
global.$RefreshReg$ = function(type, id) { return __ReactRefresh.register(type, ${JSON.stringify(id)} + ' ' + id) }
global.$RefreshSig$ = function() { return __ReactRefresh.createSignatureFunctionForTransform(); }
`);
  }

  s.append(`
if (import.meta.hot) {
  if (import.meta.hot.refresh == null) throw new Error('react-refresh runtime is not initialized');
  import.meta.hot.accept((nextExports) => {
    if (!nextExports) return;
    if (import.meta.hot.refreshUtils.isReactRefreshBoundary(nextExports)) {
      import.meta.hot.refreshUtils.enqueueUpdate();
    }
  });
}`);

  if (hasRefresh) {
    s.append(`
global.$RefreshReg$ = __prev$RefreshReg$;
global.$RefreshSig$ = __prev$RefreshSig$;
`);
  }
}

export { reactRefreshPlugin as reactRefresh };
