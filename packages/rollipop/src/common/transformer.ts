import path from 'node:path';

import { generate } from '@babel/generator';
import * as swc from '@swc/core';
import flowRemoveTypes from 'flow-remove-types';
import * as hermesParser from 'hermes-parser';

export function stripFlowSyntax(code: string, id: string) {
  const typeRemoved = flowRemoveTypes(code, { all: true, removeEmptyImports: true });
  const ast = hermesParser.parse(typeRemoved.toString(), { flow: 'all', babel: true });
  const generated = generate(ast, { sourceMaps: true, sourceFileName: path.basename(id) });

  return { code: generated.code, map: generated.map };
}

export function transformToHermesAwareSyntax(code: string, id: string) {
  const result = swc.transformSync(code, {
    filename: path.basename(id),
    configFile: false,
    swcrc: false,
    sourceMaps: true,
    // Disables the input source map to prevent error logs when
    // swc cannot find the source map file (e.g., in Yarn PnP environments).
    inputSourceMap: false,
    jsc: {
      target: 'es5',
      parser: {
        // Parse as TypeScript code because Flow modules can be `.js` files with type annotations
        syntax: 'typescript',
        // Always enable JSX parsing because Flow modules can be `.js` files with JSX syntax
        tsx: true,
      },
      keepClassNames: true,
      loose: false,
      transform: {
        react: {
          runtime: 'preserve',
        },
      },
      assumptions: {
        setPublicClassFields: true,
        privateFieldsAsProperties: true,
      },
    },

    isModule: true,
  });

  return result;
}
