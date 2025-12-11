import fs from 'node:fs';
import * as rolldown from 'rolldown';

export interface PreludePluginOptions {
  modulePaths: string[];
}

interface PreludePluginModuleInfo extends rolldown.ModuleInfo {
  meta: {
    isEntry: true;
  };
}

export function preludePlugin(options: PreludePluginOptions): rolldown.Plugin {
  const preludeImportStatements = options.modulePaths
    .map((modulePath) => `import '${modulePath}';`)
    .join('\n');

  return {
    name: 'rollipop:prelude',
    resolveId(id, _importer, extra) {
      if (extra.isEntry) {
        return { id, meta: { isEntry: true } };
      }
    },
    async load(id) {
      const moduleInfo = this.getModuleInfo(id);

      if (moduleInfo && isPreludePluginModuleInfo(moduleInfo)) {
        this.info(`Prelude plugin found entry ${id}`);
        const originSource = await fs.promises.readFile(id, 'utf-8');
        return [preludeImportStatements, originSource].join('\n');
      }
    },
  };
}

function isPreludePluginModuleInfo(
  moduleInfo: rolldown.ModuleInfo,
): moduleInfo is PreludePluginModuleInfo {
  return 'isEntry' in moduleInfo.meta;
}
