import * as rolldown from 'rolldown';

import { stripFlowSyntax } from '../../common/transformer';
import type { CodegenConfig } from '../../config/types';

export interface StripFlowSyntaxPluginOptions {
  filter: CodegenConfig['filter'];
}

export function stripFlowSyntaxPlugin(options: StripFlowSyntaxPluginOptions): rolldown.Plugin {
  return {
    name: 'rollipop:strip-flow-syntax',
    transform: {
      filter: options.filter,
      handler(code) {
        return {
          code: stripFlowSyntax(code),
          /**
           * Treat the transformed code as TSX code
           * because Flow modules can be `.js` files with type annotations and JSX syntax.
           */
          moduleType: 'tsx',
        };
      },
    },
  };
}
