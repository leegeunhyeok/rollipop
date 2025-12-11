import * as rolldown from 'rolldown';
import { stripFlowSyntax } from 'src/transformer/flow';

const flowExtensionRegex = /\.jsx?$/;

export interface StripFlowSyntaxPluginOptions {}

export function stripFlowSyntaxPlugin(options: StripFlowSyntaxPluginOptions): rolldown.Plugin {
  return {
    name: 'rollipop:strip-flow-syntax',
    async transform(code, id) {
      if (flowExtensionRegex.test(id)) {
        return {
          code: stripFlowSyntax(code),
          /**
           * Treat the transformed code as TypeScript code
           * because Flow modules can be `.js` files with type annotations and JSX syntax.
           */
          moduleType: 'tsx',
        };
      }
    },
  };
}
