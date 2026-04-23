import type * as rolldown from '@rollipop/rolldown';
import { id, include } from '@rollipop/rolldown-pluginutils';
import * as swc from '@swc/core';

import type { TransformerConfig } from '../../config';
import { mergeSwcOptions } from '../../utils/swc';
import { ROLLDOWN_RUNTIME_EXCLUDE_FILTER } from './shared/filters';
import { getFlag, TransformFlag } from './utils/transform-utils';

function swcPlugin(options?: TransformerConfig['swc']): rolldown.Plugin[] {
  const { rules = [], preset: presetOverrides } = options ?? {};
  const swcOptionsById: Map<string, swc.Options[]> = new Map();

  const swcHelpersResolvePlugin: rolldown.Plugin = {
    name: 'rollipop:swc-helpers-resolve',
    resolveId: {
      order: 'pre',
      filter: [include(id(/^@swc\/helpers/)), ROLLDOWN_RUNTIME_EXCLUDE_FILTER],
      handler(source, _importer, extraOptions) {
        return this.resolve(source, import.meta.dirname, extraOptions);
      },
    },
  };

  const swcRules = rules.map(({ filter, options }, index) => {
    return {
      name: `rollipop:swc-rule-${index}`,
      transform: {
        filter,
        handler(code, id) {
          const existingBabelOptions = swcOptionsById.get(id);
          const resolvedOptions = typeof options === 'function' ? options(code, id) : options;
          void (existingBabelOptions
            ? existingBabelOptions.push(resolvedOptions)
            : swcOptionsById.set(id, [resolvedOptions]));
        },
      },
    } satisfies rolldown.Plugin;
  });

  const swcPlugin: rolldown.Plugin = {
    name: 'rollipop:swc',
    buildStart() {
      swcOptionsById.clear();
    },
    transform: {
      filter: [ROLLDOWN_RUNTIME_EXCLUDE_FILTER],
      handler(code, id) {
        if (getFlag(this, id) & TransformFlag.SKIP_ALL) {
          return;
        }

        const swcOptions = swcOptionsById.get(id) ?? [];
        const baseOptions = getPreset(id, presetOverrides);
        const result = swc.transformSync(code, {
          filename: id,
          configFile: false,
          swcrc: false,
          sourceMaps: true,
          // Disables the input source map to prevent error logs when
          // swc cannot find the source map file (e.g., in Yarn PnP environments).
          inputSourceMap: false,
          ...mergeSwcOptions(baseOptions, ...swcOptions),
        });

        return { code: result.code, map: result.map };
      },
    },
  };

  return [swcHelpersResolvePlugin, ...swcRules, swcPlugin];
}

function getPreset(
  id: string,
  overrides?: NonNullable<TransformerConfig['swc']>['preset'],
): swc.Options {
  const preset: swc.Options = {
    env: {
      targets: { node: 9999 },
      // See:
      // - Hermes's supported features: https://github.com/facebook/hermes/blob/main/doc/Features.md
      // - Swc's transform preset: https://github.com/swc-project/swc/blob/v1.15.18/crates/swc_ecma_preset_env/src/transform_data.rs
      include: [
        'transform-block-scoping',
        // `assumptions.setPublicClassFields`
        'transform-class-properties',
        // `assumptions.privateFieldsAsProperties`
        'transform-private-methods',
        'transform-private-property-in-object',
      ],
    },
    jsc: {
      parser: {
        // Parse as TypeScript code because Flow modules can be `.js` files with type annotations
        syntax: 'typescript',
        // Always enable JSX parsing because Flow modules can be `.js` files with JSX syntax
        tsx: true,
      },
      transform: {
        react: {
          runtime: overrides?.jsxRuntime ?? 'preserve',
        },
      },
      externalHelpers: overrides?.externalHelpers ?? true,
    },
    isModule: id.endsWith('.cjs') ? 'commonjs' : true,
  };
  if (overrides?.module != null) {
    preset.module = overrides.module;
  }
  if (overrides?.define != null && Object.keys(overrides.define).length > 0) {
    // Route compile-time replacements through swc's
    // `jsc.transform.optimizer.globals.vars`. Dotted keys match nested
    // `MemberExpression`s, so `"import.meta.env"` substitutes the entire
    // member chain — `import.meta.env.FOO` becomes whatever the value
    // expression (e.g. `process.env`) combined with the leftover suffix.
    preset.jsc ??= {};
    preset.jsc.transform ??= {};
    preset.jsc.transform.optimizer ??= {};
    preset.jsc.transform.optimizer.globals = {
      ...(preset.jsc.transform.optimizer.globals ?? {}),
      vars: {
        ...(preset.jsc.transform.optimizer.globals?.vars ?? {}),
        ...overrides.define,
      },
    };
  }
  return preset;
}

export { swcPlugin as swc };
