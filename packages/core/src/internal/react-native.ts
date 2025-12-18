import path from 'node:path';

import { isNotNil } from 'es-toolkit';

import { GLOBAL_IDENTIFIER } from '../constants';

export function getInitializeCorePath(basePath: string) {
  return require.resolve('react-native/Libraries/Core/InitializeCore', { paths: [basePath] });
}

export function getPolyfillScriptPaths(reactNativePath: string) {
  const scriptPath = path.join(reactNativePath, 'rn-get-polyfills');
  return (require(scriptPath) as () => string[])();
}

export function getGlobalVariables(dev: boolean, mode: string) {
  return [
    `var __BUNDLE_START_TIME__=globalThis.nativePerformanceNow?nativePerformanceNow():Date.now();`,
    `var __DEV__=${dev};`,
    `var ${GLOBAL_IDENTIFIER}=typeof globalThis!=='undefined'?globalThis:typeof global !== 'undefined'?global:typeof window!=='undefined'?window:this;`,
    `var process=globalThis.process||{};process.env=process.env||{};process.env.NODE_ENV=process.env.NODE_ENV||"${dev ? 'development' : 'production'}";`,
    dev && mode === 'serve' ? `var $RefreshReg$ = () => {};` : null,
    dev && mode === 'serve' ? `var $RefreshSig$ = () => (v) => v;` : null,
  ].filter(isNotNil);
}
