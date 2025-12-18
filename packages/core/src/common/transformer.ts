import path from 'node:path';

import { generate } from '@babel/generator';
import * as swc from '@swc/core';
import flowRemoveTypes from 'flow-remove-types';
import * as hermesParser from 'hermes-parser';

export function stripFlowSyntax(code: string) {
  const typeRemovedCode = flowRemoveTypes(code, { all: true, removeEmptyImports: true }).toString();
  const ast = hermesParser.parse(typeRemovedCode, { flow: 'all', babel: true });
  const { code: strippedCode } = generate(ast);

  return strippedCode;
}

export function blockScoping(code: string, id: string) {
  const result = swc.transformSync(code, {
    configFile: false,
    swcrc: false,
    filename: path.basename(id),
    jsc: {
      parser: {
        // Parse as TypeScript code because Flow modules can be `.js` files with type annotations
        syntax: 'typescript',
        // Always enable JSX parsing because Flow modules can be `.js` files with JSX syntax
        tsx: true,
      },
      target: 'es5',
      keepClassNames: true,
      loose: false,
      assumptions: {
        setPublicClassFields: true,
        privateFieldsAsProperties: true,
      },
    },
    isModule: true,
  });

  return result.code;
}
