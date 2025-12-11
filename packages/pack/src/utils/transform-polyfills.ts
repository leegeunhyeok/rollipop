import * as swc from '@swc/core';

export function transformPolyfills(code: string) {
  const transformResult = swc.minifySync(code, {
    compress: true,
    sourceMap: false,
  });

  return transformResult.code;
}
