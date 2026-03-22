import path from 'node:path';

import { generate } from '@babel/generator';
import flowRemoveTypes from 'flow-remove-types';
import * as hermesParser from 'hermes-parser';

export function stripFlowTypes(code: string) {
  const typeRemoved = flowRemoveTypes(code, { all: true, removeEmptyImports: true });
  return { code: typeRemoved.toString(), map: typeRemoved.generateMap() };
}

export function stripFlowSyntax(code: string) {
  const { code: typeRemovedCode } = stripFlowTypes(code);
  const ast = parseFlowSyntax(typeRemovedCode);
  return ast;
}

export function parseFlowSyntax(code: string) {
  const ast = hermesParser.parse(code, { flow: 'all', babel: true });
  return ast;
}

export function generateSourceFromAst(ast: babel.Node, id: string) {
  const generated = generate(ast, { sourceMaps: true, sourceFileName: path.basename(id) });
  return { code: generated.code, map: generated.map };
}
