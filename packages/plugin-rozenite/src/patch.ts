import module from 'node:module';
import path from 'node:path';

const require = module.createRequire(import.meta.url);

export function patchDevtoolsFrontendUrl(projectRoot: string) {
  const rollipopModulePath = path.dirname(getRollipopPath(projectRoot));
  const getDevToolsFrontendUrlModulePath = path.dirname(getDevMiddlewarePath(rollipopModulePath));
  const getDevToolsFrontendUrlModule = require(
    path.join(getDevToolsFrontendUrlModulePath, '/utils/getDevToolsFrontendUrl'),
  );
  const getDevToolsFrontendUrl = getDevToolsFrontendUrlModule.default;
  getDevToolsFrontendUrlModule.default = (
    experiments: unknown,
    webSocketDebuggerUrl: string,
    devServerUrl: string,
    options: unknown,
  ) => {
    const originalUrl = getDevToolsFrontendUrl(
      experiments,
      webSocketDebuggerUrl,
      devServerUrl,
      options,
    );
    return originalUrl.replace('/debugger-frontend/', '/rozenite/');
  };
}

function getRollipopPath(projectRoot: string) {
  return require.resolve('rollipop', {
    paths: [projectRoot],
  });
}

function getDevMiddlewarePath(rollipopPath: string) {
  return require.resolve('@react-native/dev-middleware', {
    paths: [rollipopPath],
  });
}
