/**
 * jest transformer running every source through rollipop's default
 * transform chain — same plugin set, same filter conditions, same
 * apply semantics as the bundler's default.
 *
 * The chain is built synchronously at factory time (no `loadConfig`,
 * no worker thread) so jest's `SyncTransformer.process` contract holds
 * without any IPC hop. `fast-flow-transform` (async-only) is swapped
 * for a babel-based sync Flow stripper of identical shape — see
 * `sync-flow-strip-plugin.ts`.
 */

import { createHash } from 'node:crypto';
import nodePath from 'node:path';

import createCacheKeyFunction from '@jest/create-cache-key-function';
import type {
  SyncTransformer,
  TransformedSource,
  TransformOptions,
} from '@jest/transform';

import { runTransformChain } from '../core/plugins/run-transform-chain';
import { runTransformChainSync } from '../core/plugins/run-transform-chain-sync';
import type { Plugin } from '../core/plugins/types';
import { buildDefaultJestChain } from './default-chain';

export interface TransformerOptions {
  /**
   * Reserved for future per-project knobs (e.g. platform selection).
   * Currently unused; included so the `createTransformer(options)`
   * call shape stays forward-compatible.
   */
  platform?: 'ios' | 'android';
}

/**
 * One chain instance is shared across every `process`/`processAsync`
 * call in a jest worker. The plugin objects are stateful (they track a
 * per-file flag in their meta store via the mock plugin context), so a
 * fresh `metaStore` per transformer instance is handed down instead of
 * rebuilding the chain itself.
 */
const defaultChain: Plugin[] = buildDefaultJestChain();

function rollipopVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require(nodePath.join(__dirname, '..', '..', 'package.json')) as {
      version: string;
    };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

// `createCacheKeyFunction`'s return type unions an old four-arg shape
// with the current three-arg shape. We only call it in its modern form
// but have to tell the compiler so.
const cacheKeyBase = createCacheKeyFunction([], [rollipopVersion()]) as (
  sourceText: string,
  sourcePath: string,
  options: { config: unknown; configString: string; instrument: boolean },
) => string;

export function createTransformer(
  options: TransformerOptions = {},
): SyncTransformer<TransformerOptions> {
  const metaStore = new Map<string, Record<string | symbol, unknown>>();
  const optionsHash = createHash('sha1')
    .update(JSON.stringify({ platform: options.platform ?? 'ios' }))
    .digest('hex')
    .slice(0, 12);

  return {
    canInstrument: false,

    process(sourceText, sourcePath): TransformedSource {
      const result = runTransformChainSync(defaultChain, sourceText, sourcePath, {
        metaStore,
      });
      if (result == null) return { code: sourceText };
      return { code: result.code, ...(result.map != null ? { map: result.map as never } : null) };
    },

    async processAsync(sourceText, sourcePath): Promise<TransformedSource> {
      // The default chain is fully synchronous, so the async path
      // resolves via the shared async runner without any network or fs
      // wait — it exists so user plugins that contribute async
      // transforms still work when jest picks `processAsync`.
      const result = await runTransformChain(defaultChain, sourceText, sourcePath, {
        metaStore,
      });
      if (result == null) return { code: sourceText };
      return { code: result.code, ...(result.map != null ? { map: result.map as never } : null) };
    },

    getCacheKey(
      sourceText,
      sourcePath,
      transformOptions: TransformOptions<TransformerOptions>,
    ): string {
      const inner = cacheKeyBase(sourceText, sourcePath, {
        config: transformOptions.config,
        configString: transformOptions.configString,
        instrument: transformOptions.instrument,
      });
      return createHash('sha1').update(`${optionsHash}:${inner}`).digest('hex');
    },
  } satisfies SyncTransformer<TransformerOptions>;
}
