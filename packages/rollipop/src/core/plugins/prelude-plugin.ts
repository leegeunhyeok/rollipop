import fs from 'node:fs';

import * as rolldown from '@rollipop/rolldown';

const IS_ENTRY = Symbol('IS_ENTRY');

export interface PreludePluginOptions {
  modulePaths: string[];
}

function preludePlugin(options: PreludePluginOptions): rolldown.Plugin | null {
  if (options.modulePaths.length === 0) {
    return null;
  }

  const preludeImportStatements = options.modulePaths
    .map((modulePath) => `import '${modulePath}';`)
    .join('\n');

  let processed = false;

  return {
    name: 'rollipop:prelude',
    buildStart() {
      processed = false;
    },
    resolveId: {
      handler: (source, _importer, extraOptions) => {
        if (extraOptions.isEntry) {
          return { id: source, meta: { [IS_ENTRY]: true } };
        }
      },
    },
    load: {
      handler(id) {
        if (processed) {
          return;
        }

        const moduleInfo = this.getModuleInfo(id);

        if (moduleInfo && isEntry(moduleInfo.meta)) {
          this.debug(`Prelude plugin found entry ${id}`);
          const originSource = fs.readFileSync(id, 'utf-8');
          const modifiedSource = [preludeImportStatements, originSource].join('\n');

          processed = true;

          return modifiedSource;
        }
      },
    },
  };
}

type PreludePluginMeta = rolldown.CustomPluginOptions & {
  isEntry: true;
};

function isEntry(meta: rolldown.CustomPluginOptions): meta is PreludePluginMeta {
  return IS_ENTRY in meta;
}

export { preludePlugin as prelude };
