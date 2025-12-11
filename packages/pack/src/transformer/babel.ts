import * as babel from '@babel/core';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export function transformCodegenNativeComponent(code: string, id: string) {
  const result = babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    filename: path.basename(id),
    parserOpts: {
      flow: 'all',
    } as any,
    plugins: [
      require.resolve('babel-plugin-syntax-hermes-parser'),
      require.resolve('@babel/plugin-transform-flow-strip-types'),
      [require.resolve('@babel/plugin-syntax-typescript'), false],
      require.resolve('@react-native/babel-plugin-codegen'),
    ],
    overrides: [
      {
        test: /\.ts$/,
        plugins: [['@babel/plugin-syntax-typescript', { isTSX: false, allowNamespaces: true }]],
      },
      {
        test: /\.tsx$/,
        plugins: [['@babel/plugin-syntax-typescript', { isTSX: true, allowNamespaces: true }]],
      },
    ],
  });

  if (result?.code == null) {
    throw new Error('Failed to transform codegen native component');
  }

  return result.code;
}
