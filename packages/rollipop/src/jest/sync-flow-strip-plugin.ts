/**
 * Synchronous Flow-strip plugin for the rollipop jest transformer.
 *
 * The build-side `rollipop:react-native-strip-flow-syntax` delegates to
 * `fast-flow-transform`, whose native binding returns only Promises.
 * jest's `SyncTransformer.process` contract forbids that — so for the
 * jest chain we run a synchronous substitute with a two-tier strategy:
 *
 *   1. Fast path: `flow-remove-types` (hermes-parser-backed, pure JS).
 *      This is the stripper rollipop itself used pre-commit d7e084a,
 *      before the `fast-flow-transform` migration traded sync for raw
 *      throughput. It covers ordinary Flow type annotations (~95 % of
 *      RN 0.84's flow-tagged files) in ~milliseconds per file.
 *   2. Fallback: babel with `@babel/plugin-transform-flow-strip-types`
 *      and `babel-plugin-syntax-hermes-parser`, used only for files
 *      that contain Flow's newer *declaration* syntax (`component`
 *      declarations, etc.) which `flow-remove-types` leaves untouched
 *      because it strips tokens rather than rewriting declarations.
 *
 * Semantics match the build plugin:
 *   - Same filter (only applies to `.js`/`.jsx` files containing `@flow`)
 *   - Same TransformFlag handshake (`SKIP_ALL`, `CODEGEN_REQUIRED`,
 *     `STRIP_FLOW_REQUIRED`) so downstream babel/swc behave identically
 *   - Same `moduleType: 'tsx'` hint for swc
 */

import type * as rolldown from '@rollipop/rolldown';
import * as babel from '@babel/core';
// No @types packages exist for these plugins; we invoke them via
// `plugins: [[plugin, options]]` and `flow-remove-types` ships CJS only.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — no bundled types
import babelPluginFlowStripTypes from '@babel/plugin-transform-flow-strip-types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — no bundled types
import babelPluginSyntaxHermesParser from 'babel-plugin-syntax-hermes-parser';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — no bundled types
import flowRemoveTypes from 'flow-remove-types';

import type { Plugin } from '../core/plugins/types';
import { getFlag, setFlag, TransformFlag } from '../core/plugins/utils/transform-utils';

interface FlowRemoveTypesResult {
  toString(): string;
  generateMap(): unknown;
}

type FlowRemoveTypes = (
  code: string,
  options?: { all?: boolean; pretty?: boolean; ignoreUninitializedFields?: boolean },
) => FlowRemoveTypesResult;

const stripFlow = flowRemoveTypes as FlowRemoveTypes;

// Matches Flow's `component` declaration (`component Foo(...) { ... }`)
// which `flow-remove-types` leaves in place. Any hit forces the slower
// babel fallback for that file.
const COMPONENT_DECLARATION_RE = /\bcomponent\s+[A-Z][\w$]*\s*[(<]/;

/**
 * Construct the sync flow-strip plugin with the given filter. Keeps the
 * `rollipop:react-native-strip-flow-syntax` name so jest and build
 * pipelines agree on plugin identity in logs and caches.
 */
export function createSyncFlowStripPlugin(
  filter: rolldown.HookFilter | undefined,
): Plugin {
  return {
    name: 'rollipop:react-native-strip-flow-syntax',
    transform: {
      order: 'pre',
      filter,
      handler(code: string, id: string) {
        const flags = getFlag(this as never, id);
        if (flags & TransformFlag.SKIP_ALL) return;
        if (flags & TransformFlag.CODEGEN_REQUIRED) {
          return { meta: setFlag(this as never, id, TransformFlag.STRIP_FLOW_REQUIRED) };
        }

        const needsBabel = COMPONENT_DECLARATION_RE.test(code);
        const out = needsBabel ? stripViaBabel(code, id) : stripViaFlowRemoveTypes(code);
        if (out == null) return;
        return {
          code: out.code,
          map: out.map as never,
          moduleType: 'tsx',
        };
      },
    },
  };
}

function stripViaFlowRemoveTypes(code: string): { code: string; map: unknown } {
  // `pretty: true` actually removes the Flow tokens instead of replacing
  // them with spaces — this yields shorter output and matches what
  // `fast-flow-transform` produces on the build side.
  const result = stripFlow(code, { all: true, pretty: true });
  return { code: result.toString(), map: result.generateMap() };
}

function stripViaBabel(code: string, id: string): { code: string; map: unknown } | null {
  const result = babel.transformSync(code, {
    filename: id,
    babelrc: false,
    configFile: false,
    sourceMaps: true,
    plugins: [
      [babelPluginFlowStripTypes, { allowDeclareFields: true, requireDirective: false }],
      [babelPluginSyntaxHermesParser, { parseLangTypes: 'flow' }],
    ],
    parserOpts: {
      plugins: ['flow', 'jsx'],
    },
  });
  if (result?.code == null) return null;
  return { code: result.code, map: result.map };
}
