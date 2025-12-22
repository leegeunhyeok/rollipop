import dedent from 'dedent';
import { invariant } from 'es-toolkit';
import { describe, expect, it } from 'vitest';

import { testPluginDriver } from '../../../testing/plugin-testing-utils';
import { reactRefresh } from '../react-refresh-plugin';

describe('rollipop:transform-react-refresh', () => {
  const CODE = dedent`
  import { useEffect } from 'react';
  import { Text } from 'react-native';

  function App() {
    useEffect(() => {
      throw new Error('Boom!');
    }, []);

    return <Text>Hello, world!</Text>;
  }

  export default App;
  `;

  it('should transform React component to React Refresh component', async () => {
    const driver = testPluginDriver(reactRefresh());
    const result = await driver.transform(CODE, 'test.tsx');

    invariant(typeof result === 'object', 'invalid result');
    const code = result.code?.toString();

    expect(code).toContain('$RefreshReg$');
    expect(code).toContain('$RefreshSig$');
    expect(code).toContain('import.meta.hot');
    expect(code).toMatchInlineSnapshot(`
      "
      var __prev$RefreshReg$ = global.$RefreshReg$;
      var __prev$RefreshSig$ = global.$RefreshSig$;
      global.$RefreshReg$ = function(type, id) { return __ReactRefresh.register(type, "test.tsx" + ' ' + id) }
      global.$RefreshSig$ = function() { return __ReactRefresh.createSignatureFunctionForTransform(); }
      import { useEffect } from "react";
      import { Text } from "react-native";
      var _jsxFileName = "test.tsx";
      import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
      var _s = __ROLLIPOP_GLOBAL__.$RefreshSig$();
      function App() {
      	_s();
      	useEffect(() => {
      		throw new Error("Boom!");
      	}, []);
      	return /* @__PURE__ */ _jsxDEV(Text, { children: "Hello, world!" }, void 0, false, {
      		fileName: _jsxFileName,
      		lineNumber: 9,
      		columnNumber: 10
      	}, this);
      }
      _s(App, "OD7bBpZva5O2jO+Puf00hKivP7c=");
      _c = App;
      export default App;
      var _c;
      __ROLLIPOP_GLOBAL__.$RefreshReg$(_c, "App");

      if (import.meta.hot) {
        if (import.meta.hot.refresh == null) throw new Error('react-refresh runtime is not initialized');
        import.meta.hot.accept((nextExports) => {
          if (!nextExports) return;
          if (import.meta.hot.refreshUtils.isReactRefreshBoundary(nextExports)) {
            import.meta.hot.refresh.performReactRefresh();
          }
        });
      }
      global.$RefreshReg$ = __prev$RefreshReg$;
      global.$RefreshSig$ = __prev$RefreshSig$;
      "
    `);
  });
});
