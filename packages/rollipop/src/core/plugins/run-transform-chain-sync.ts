/**
 * Synchronous variant of `runTransformChain` for callers that cannot
 * `await` — most notably jest's `SyncTransformer.process` contract.
 *
 * The rollipop plugin chain is mostly synchronous in practice (swc, babel
 * core — both use `transformSync`). The one genuinely-async step is
 * `rollipop:react-native-strip-flow-syntax`, which delegates to
 * `fast-flow-transform`. When `options.flowStripSync` is supplied we
 * transparently substitute that plugin for a synchronous babel-based
 * flow stripper so the complete build chain runs end-to-end without
 * blocking the event loop.
 *
 * If any remaining plugin returns a Promise we throw — that indicates a
 * new async hook has appeared upstream and the jest transformer needs to
 * be taught about it.
 */

import { interpreter } from '@rollipop/rolldown-pluginutils';

import type { Plugin } from './types';

type Matcher = string | RegExp;

interface SimpleFilter {
  id?: Matcher | Matcher[];
  code?: Matcher | Matcher[];
  moduleType?: string | string[];
}

export interface RunSyncContext {
  metaStore: Map<string, Record<string | symbol, unknown>>;
  moduleType?: string;
}

export interface TransformChainSyncResult {
  code: string;
  map?: unknown;
  moduleType?: string;
}

export interface RunSyncOptions {
  /**
   * Plugin name whose async transform should be replaced with the
   * provided synchronous alternative. Used to swap out
   * `rollipop:react-native-strip-flow-syntax` (fast-flow-transform is
   * async-only) with a babel flow-strip substitute.
   */
  substitutePlugins?: Record<string, Plugin>;
}

export function runTransformChainSync(
  plugins: Plugin[],
  code: string,
  id: string,
  ctx: RunSyncContext,
  options: RunSyncOptions = {},
): TransformChainSyncResult | null {
  let current = code;
  let map: unknown;
  let moduleType = ctx.moduleType;
  let changed = false;

  for (const original of plugins) {
    const plugin = options.substitutePlugins?.[original.name] ?? original;
    const transform = plugin.transform;
    if (transform == null) continue;

    const handler =
      typeof transform === 'function'
        ? transform
        : 'handler' in transform
          ? transform.handler
          : null;
    if (typeof handler !== 'function') continue;

    const filter = typeof transform === 'function' ? null : transform.filter;
    if (!evaluateFilter(filter, id, current, moduleType)) continue;

    const pluginCtx = buildPluginContext(ctx);
    const result = (handler as (this: unknown, c: string, i: string) => unknown).call(
      pluginCtx,
      current,
      id,
    );

    if (result != null && typeof (result as { then?: unknown }).then === 'function') {
      throw new Error(
        `[rollipop/jest] plugin "${plugin.name}" returned a Promise from its transform hook; ` +
          `the synchronous jest transformer requires sync plugins. ` +
          `If this plugin has an async dependency, provide a sync substitute via options.`,
      );
    }

    if (result == null) continue;

    if (typeof result === 'object') {
      const r = result as Record<string, unknown>;
      if (r.meta != null && typeof r.meta === 'object') {
        Object.assign(getMeta(ctx, id), r.meta as Record<string | symbol, unknown>);
      }
      if (typeof r.code === 'string') {
        current = r.code;
        map = r.map;
        changed = true;
      }
      if (typeof r.moduleType === 'string') {
        moduleType = r.moduleType;
      }
    } else if (typeof result === 'string') {
      current = result;
      changed = true;
    }
  }

  return changed ? { code: current, map, moduleType } : null;
}

function getMeta(ctx: RunSyncContext, id: string): Record<string | symbol, unknown> {
  let meta = ctx.metaStore.get(id);
  if (meta == null) {
    meta = {};
    ctx.metaStore.set(id, meta);
  }
  return meta;
}

function buildPluginContext(ctx: RunSyncContext): {
  getModuleInfo: (id: string) => { meta: Record<string | symbol, unknown> } | null;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => never;
  debug: (...args: unknown[]) => void;
} {
  return {
    getModuleInfo(id) {
      return { meta: getMeta(ctx, id) };
    },
    warn(...args) {
      // eslint-disable-next-line no-console
      console.warn('[rollipop/jest:transform-chain]', ...args);
    },
    error(...args) {
      throw new Error(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
    },
    debug() {
      // no-op
    },
  };
}

function isComposableFilter(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(isComposableFilter);
  return typeof (value as { kind?: unknown }).kind === 'string';
}

function matchesMatcher(value: string, matcher: Matcher): boolean {
  return typeof matcher === 'string' ? value === matcher : matcher.test(value);
}

function matchesAny(value: string, matcher: Matcher | Matcher[]): boolean {
  return Array.isArray(matcher)
    ? matcher.some((m) => matchesMatcher(value, m))
    : matchesMatcher(value, matcher);
}

function evaluateFilter(
  filter: unknown,
  id: string,
  code: string,
  moduleType: string | undefined,
): boolean {
  if (filter == null) return true;

  if (isComposableFilter(filter)) {
    const filters = Array.isArray(filter) ? filter : [filter];
    return interpreter(filters as never, code, id, moduleType as never);
  }

  const simple = filter as SimpleFilter;
  if (simple.id != null && !matchesAny(id, simple.id)) return false;
  if (simple.code != null && !matchesAny(code, simple.code)) return false;
  if (simple.moduleType != null) {
    const types = Array.isArray(simple.moduleType) ? simple.moduleType : [simple.moduleType];
    if (moduleType == null || !types.includes(moduleType)) return false;
  }
  return true;
}
