/**
 * Build the default transform chain used by the jest transformer.
 *
 * Mirrors the subset of rollipop's build-time plugin chain that actually
 * applies to jest (which only sees per-file transforms — `load` hooks
 * like asset / json / svg / prelude never fire). The chain consists of:
 *
 *   1. `rollipop:react-native-codegen-marker` — flags files that declare
 *      a `codegenNativeComponent<…>()` so the babel step further down
 *      can run `@react-native/babel-plugin-codegen` on them.
 *   2. `rollipop:react-native-strip-flow-syntax` — sync babel variant of
 *      the build plugin (see `sync-flow-strip-plugin.ts` for why).
 *   3. `rollipop:babel*` — the same factory the bundler uses, invoked
 *      with defaults (no user rules). Handles TS/flow/codegen based on
 *      the flags set by stages 1 and 2.
 *   4. `rollipop:swc*` — again the bundler's factory, with jest-tailored
 *      preset overrides (CJS output, inline helpers, automatic JSX
 *      runtime, `import.meta.*` rewrites).
 *
 * Using the same factories guarantees filter parity with the build
 * pipeline: whenever rollipop's bundler would apply a plugin to a given
 * file, jest does too. Nothing is duplicated or reinterpreted.
 */

import type * as rolldown from '@rollipop/rolldown';

import { babel } from '../core/plugins/babel-plugin';
import { swc } from '../core/plugins/swc-plugin';
import type { Plugin } from '../core/plugins/types';
import { TransformFlag, setFlag } from '../core/plugins/utils/transform-utils';
import { createSyncFlowStripPlugin } from './sync-flow-strip-plugin';

// Defaults lifted verbatim from `src/config/defaults.ts` so the jest
// chain matches the bundler's out-of-the-box filters.
const DEFAULT_FLOW_FILTER: rolldown.HookFilter = {
  id: /\.jsx?$/,
  code: /@flow/,
};

const DEFAULT_CODEGEN_FILTER: rolldown.HookFilter = {
  code: /\bcodegenNativeComponent</,
};

/**
 * `rollipop:react-native-codegen-marker` — identical to the one
 * constructed inside `react-native-plugin.ts`. Kept here (rather than
 * imported) because the build factory returns it bundled with
 * asset/hmr plugins that require a full `ResolvedConfig` to construct;
 * jest has no need for those and should not depend on `loadConfig`.
 */
function createCodegenMarkerPlugin(): Plugin {
  return {
    name: 'rollipop:react-native-codegen-marker',
    transform: {
      order: 'pre',
      filter: DEFAULT_CODEGEN_FILTER,
      handler(_code, id) {
        return { meta: setFlag(this as never, id, TransformFlag.CODEGEN_REQUIRED) };
      },
    },
  };
}

/**
 * swc preset overrides the jest chain always applies. Keeping these in
 * one place makes it obvious which knobs differ from the build path.
 */
const JEST_SWC_PRESET = {
  // jest runs transformed files directly under Node's CJS loader —
  // there is no bundler downstream to share helpers, preserve JSX, or
  // tree-shake ESM. Every transformed file must stand alone.
  externalHelpers: false,
  module: { type: 'commonjs' as const },
  jsxRuntime: 'automatic' as const,
  // `import.meta.*` is ESM-only; Node's CJS loader throws on a bare
  // `import.meta`. Inline the rollipop runtime idioms so the CJS output
  // is syntactically valid:
  //   - `import.meta.env.X` → `process.env.X`
  //   - `import.meta.hot`   → `undefined` (HMR blocks become dead code)
  define: {
    'import.meta.env': 'process.env',
    'import.meta.hot': 'undefined',
  },
};

/**
 * Produce the jest default chain. The result is ordered identically to
 * the bundler's chain, minus load-only plugins (asset / json / svg /
 * prelude) that cannot fire on the already-loaded sources jest hands
 * to transformers.
 */
export function buildDefaultJestChain(): Plugin[] {
  return [
    createCodegenMarkerPlugin(),
    createSyncFlowStripPlugin(DEFAULT_FLOW_FILTER),
    ...babel(),
    ...swc({ preset: JEST_SWC_PRESET }),
  ];
}
