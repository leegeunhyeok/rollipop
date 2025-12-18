import type * as rolldown from 'rolldown';
import { transformSync } from 'rolldown/experimental';

import { GLOBAL_IDENTIFIER } from '../../constants';

const DEFAULT_INCLUDE_REGEX = /\.[tj]sx?(?:$|\?)/;
const DEFAULT_EXCLUDE_REGEX = /\/node_modules\//;

const HAS_REFRESH_REGEX = /\$RefreshReg\$\(/;
const ONLY_REACT_COMPONENT_REGEX = /extends\s+(?:React\.)?(?:Pure)?Component/;

export interface ReactRefreshPluginOptions {
  importSource?: string;
  include?: RegExp | string;
  exclude?: RegExp | string;
}

function reactRefreshPlugin(options?: ReactRefreshPluginOptions): rolldown.Plugin {
  const {
    importSource,
    include = DEFAULT_INCLUDE_REGEX,
    exclude = DEFAULT_EXCLUDE_REGEX,
  } = options ?? {};

  return {
    name: 'rollipop:react-refresh',
    transform: {
      filter: {
        id: {
          include,
          exclude,
        },
      },
      handler(code, id) {
        const { code: transformedCode } = transformSync(id, code, {
          jsx: {
            importSource,
            runtime: 'automatic',
            development: true,
            refresh: {
              refreshReg: `${GLOBAL_IDENTIFIER}.$RefreshReg$`,
              refreshSig: `${GLOBAL_IDENTIFIER}.$RefreshSig$`,
            },
          },
        });

        return addRefreshWrapper(transformedCode, id);
      },
    },
  };
}

export function addRefreshWrapper(code: string, id: string) {
  const hasRefresh = HAS_REFRESH_REGEX.test(code);
  const onlyReactComponent = ONLY_REACT_COMPONENT_REGEX.test(code);

  if (!(hasRefresh || onlyReactComponent)) {
    return;
  }

  let newCode = hasRefresh
    ? `
var _prev$RefreshReg$ = global.$RefreshReg$;
var _prev$RefreshSig$ = global.$RefreshSig$;
global.$RefreshReg$ = function(type, id) { return __ReactRefresh.register(type, ${JSON.stringify(id)} + ' ' + id) }
global.$RefreshSig$ = function() { return __ReactRefresh.createSignatureFunctionForTransform(); }
`
    : '';
  newCode += code;
  newCode += `
if (import.meta.hot) {
  if (import.meta.hot.refresh == null) throw new Error('react-refresh runtime is not initialized');
  import.meta.hot.accept((nextExports) => {
    if (!nextExports) return;
    if (import.meta.hot.refreshUtils.isReactRefreshBoundary(nextExports)) {
      import.meta.hot.refresh.performReactRefresh();
    }
  });
}`;

  if (hasRefresh) {
    newCode += `
global.$RefreshReg$ = _prev$RefreshReg$;
global.$RefreshSig$ = _prev$RefreshSig$;
`;
  }

  return newCode;
}

export { reactRefreshPlugin as reactRefresh };
