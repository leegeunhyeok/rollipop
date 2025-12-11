import * as rolldown from 'rolldown';
import { transformCodegenNativeComponent } from 'src/transformer/babel';

const codegenTargetRegex = /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/;

export interface CodegenPluginOptions {}

export function codegenPlugin(options: CodegenPluginOptions): rolldown.Plugin {
  return {
    name: 'rollipop:codegen',
    async transform(code, id) {
      if (codegenTargetRegex.test(id)) {
        this.info(`Transforming codegen native component ${id}`);
        return transformCodegenNativeComponent(code, id);
      }
    },
  };
}
