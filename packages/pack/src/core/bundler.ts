import * as rolldown from 'rolldown';
import { invariant } from 'es-toolkit';
import type { Config } from 'src/config/types';
import { toRolldownOptions } from 'src/config/to-rolldown-options';
import { stripFlowSyntaxPlugin } from './plugins/strip-flow-syntax-plugin';
import { preludePlugin } from './plugins/prelude-plugin';
import { assetRegistryPlugin } from './plugins/asset-registry-plugin';
import { codegenPlugin } from './plugins/codegen-plugin';

export class Bundler {
  private readonly rolldownInputOptions: rolldown.InputOptions;
  private readonly rolldownOutputOptions: rolldown.OutputOptions;

  static runServer(instance: Bundler) {
    // TODO
  }

  constructor(private readonly config: Config) {
    const { input, output } = toRolldownOptions(this.config, 'ios');
    this.rolldownInputOptions = input;
    this.rolldownOutputOptions = output;
  }

  async build() {
    const t0 = performance.now();
    const buildResult = await rolldown.build({
      ...this.rolldownInputOptions,
      plugins: [
        preludePlugin({ modulePaths: this.config.serializer?.prelude ?? [] }),
        codegenPlugin({}),
        stripFlowSyntaxPlugin({}),
        assetRegistryPlugin({}),
      ],
      output: {
        ...this.rolldownOutputOptions,
        dir: 'dist', // TODO
      },
      write: true,
    });

    const t1 = performance.now();
    console.log(`Rolldown build took ${t1 - t0}ms`);

    const chunk = buildResult.output[0];
    invariant(chunk, 'Bundled chunk is not found');

    return chunk;
  }
}
