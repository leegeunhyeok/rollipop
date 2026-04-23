import { interpreter } from '@rollipop/rolldown-pluginutils';

import type { Plugin } from './types';

type Matcher = string | RegExp;

interface SimpleFilter {
  id?: Matcher | Matcher[];
  code?: Matcher | Matcher[];
  moduleType?: string | string[];
}

export interface RunContext {
  /**
   * Per-module metadata object shared across plugin invocations. Rollipop
   * plugins cooperate through `this.getModuleInfo(id).meta[FLAG_KEY]`
   * (see `core/plugins/utils/transform-utils.ts`). Callers should pass a
   * fresh `Map` for each run to avoid cross-call contamination.
   */
  metaStore: Map<string, Record<string | symbol, unknown>>;
  moduleType?: string;
}

export interface TransformChainResult {
  code: string;
  map?: unknown;
  moduleType?: string;
}

/**
 * Run every `transform` hook from the given rollipop plugin chain on
 * `(code, id)`, exactly like rolldown would during a build. Returns the
 * final transformed code, or `null` if no plugin actually changed
 * anything.
 *
 * Intended for runners (e.g. vitest) that want to reuse rollipop's build
 * transforms verbatim without registering each plugin individually in
 * their own plugin container.
 */
export async function runTransformChain(
  plugins: Plugin[],
  code: string,
  id: string,
  ctx: RunContext,
): Promise<TransformChainResult | null> {
  let current = code;
  let map: unknown;
  let moduleType = ctx.moduleType;
  let changed = false;

  for (const plugin of plugins) {
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
    const result = await (handler as (this: unknown, c: string, i: string) => unknown).call(
      pluginCtx,
      current,
      id,
    );

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

function getMeta(ctx: RunContext, id: string): Record<string | symbol, unknown> {
  let meta = ctx.metaStore.get(id);
  if (meta == null) {
    meta = {};
    ctx.metaStore.set(id, meta);
  }
  return meta;
}

/**
 * Minimal plugin context exposing `this.getModuleInfo(id).meta` backed by
 * the run context's meta store. Rollipop's `setFlag` / `getFlag` helpers
 * mutate the meta object in place, so we hand out the same reference the
 * store already owns.
 */
function buildPluginContext(ctx: RunContext): {
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
      console.warn('[rollipop:transform-chain]', ...args);
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
