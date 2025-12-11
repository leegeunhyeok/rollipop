import { generate } from '@babel/generator';
import flowRemoveTypes from 'flow-remove-types';
import * as hermesParser from 'hermes-parser';

export function stripFlowSyntax(code: string) {
  const typeRemovedCode = flowRemoveTypes(code, { all: true, removeEmptyImports: true }).toString();
  const ast = hermesParser.parse(typeRemovedCode, { flow: 'all', babel: true });
  const { code: strippedCode } = generate(ast);

  return strippedCode;
}
