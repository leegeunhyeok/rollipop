/**
 * `vitest()` — wires rollipop's transform pipeline into vitest so tests
 * run against the same transformed sources the bundler produces.
 *
 * vitest is dev-server-like (no bundling) — only the entry module hits
 * rollipop's transform hook, and every transitive `require()` escapes into
 * Node's native CJS loader. That chokes on Flow/TS syntax in unprocessed
 * React Native sources. Rather than fighting vite's pipeline we pre-build
 * every source in the matched packages through rollipop's transform chain
 * into a prebuild directory (`.rollipop/.vitest/`) and alias those
 * packages to the prebuild output. Node then only ever loads
 * already-transformed code, and the transform pipeline between build and
 * test stays bit-identical.
 *
 * Target selection follows `@react-native/jest-preset`'s
 * `transformIgnorePatterns`: `react-native`, `jest-react-native`,
 * `@react-native/*`, `@react-native-community/*`. Callers can extend the
 * match set via `include` or carve out specific packages via `exclude`.
 * The concrete list is always the intersection with the project's own
 * `dependencies` / `devDependencies`, each located via `require.resolve`
 * so monorepo layouts and PnP resolve correctly.
 */

import { createHash } from 'node:crypto';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../../config';
import { DEFAULT_SOURCE_EXTENSIONS } from '../../constants';
import { resolvePluginChain } from '../../core/plugins/resolve-plugin-chain';
import { runTransformChain } from '../../core/plugins/run-transform-chain';
import { buildPrebuild, getPrebuildRoot, resolvePrebuildTargets } from './prebuild';
import type { Plugin } from 'vite';
import type { ViteUserConfig } from 'vitest/config';

export type Platform = 'ios' | 'android';

export interface VitestPluginOptions {
  /**
   * Platform whose file-extension variant is preferred when resolving
   * (`App.ios.tsx` > `App.native.tsx` > `App.tsx`). Mirrors jest-preset's
   * `haste.defaultPlatform`.
   * @default 'ios'
   */
  platform?: Platform;
  /**
   * Project root passed to `loadConfig` and used as the base for prebuild
   * target resolution.
   * @default process.cwd()
   */
  root?: string;
  /**
   * Explicit path to a `rollipop.config.ts` file, forwarded to
   * `loadConfig`.
   * @default auto-discover
   */
  configFile?: string;
  /**
   * Extra package-name patterns to prebuild, appended to the built-in
   * jest-preset allow-list (`react-native`, `@react-native/*`,
   * `@react-native-community/*`). Typical use: third-party RN libraries
   * shipped as Flow/TS source, e.g. `[/^react-native-reanimated$/]`.
   */
  include?: RegExp | RegExp[];
  /**
   * Package-name patterns to always exclude from prebuild, even when they
   * match `include` or the built-in allow-list.
   */
  exclude?: RegExp | RegExp[];
  /**
   * Max files transformed in parallel during prebuild.
   * @default 16
   */
  concurrency?: number;
}

/** Absolute path to the plugin's runtime setup file. */
export function getSetupFilePath(): string {
  return fileURLToPath(new URL('./vitest-setup.js', import.meta.url));
}

function buildExtensions(sourceExtensions: string[], platform: Platform): string[] {
  const prefixes = [`.${platform}.`, '.native.', '.'];
  return prefixes.flatMap((prefix) => sourceExtensions.map((ext) => `${prefix}${ext}`));
}

function normaliseMatchers(value: RegExp | RegExp[] | undefined): RegExp[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export async function vitest(options: VitestPluginOptions = {}): Promise<Plugin> {
  const {
    platform = 'ios',
    root = process.cwd(),
    configFile,
    include,
    exclude,
    concurrency,
  } = options;
  const includeMatchers = normaliseMatchers(include);
  const excludeMatchers = normaliseMatchers(exclude);

  const rollipopConfig = await loadConfig({ cwd: root, configFile, mode: 'development' });
  const { sourceExtensions, mainFields, conditionNames } = rollipopConfig.resolver;

  const chain = await resolvePluginChain(
    rollipopConfig,
    { platform, dev: true },
    { buildType: 'build' },
  );
  const userChain = chain.filter((p) => !p.name.startsWith('builtin:'));

  const targets = resolvePrebuildTargets(root, {
    include: includeMatchers,
    exclude: excludeMatchers,
  });
  const prebuildRoot = getPrebuildRoot(root);
  const cacheKey = createHash('sha1')
    .update(
      JSON.stringify({
        platform,
        plugins: userChain.map((p) => p.name),
        include: includeMatchers.map((r) => r.source),
        exclude: excludeMatchers.map((r) => r.source),
      }),
    )
    .digest('hex')
    .slice(0, 12);

  const prebuildPromise = buildPrebuild({
    root,
    chain: userChain,
    platform,
    prebuildRoot,
    cacheKey,
    concurrency,
    include: includeMatchers,
    exclude: excludeMatchers,
  }).then((result) => {
    const changed = result.filesTransformed + result.filesCopied;
    if (changed > 0 || result.trampolinesWritten > 0) {
      console.info(
        `[rollipop/vitest] prebuild completed: ${result.filesTransformed} transformed, ` +
          `${result.filesCopied} copied, ${result.filesCached} cached, ` +
          `${result.trampolinesWritten} jest-preset trampolines (${result.durationMs}ms)`,
      );
    }
    for (const warning of result.warnings) {
      console.warn(`[rollipop/vitest] ${warning}`);
    }
    return result;
  });

  // Alias entries redirect every matched package to its prebuild output so
  // the original node_modules paths are never loaded. `find` uses a regex
  // so subpath imports (`react-native/Libraries/...`) alias cleanly too.
  const alias = targets.flatMap((target) => {
    const prebuildDir = nodePath.join(prebuildRoot, target.name);
    const escaped = target.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [
      { find: new RegExp(`^${escaped}$`), replacement: prebuildDir },
      { find: new RegExp(`^${escaped}/`), replacement: `${prebuildDir}/` },
    ];
  });

  const metaStore = new Map<string, Record<string | symbol, unknown>>();

  return {
    name: 'rollipop:vitest',
    enforce: 'pre',
    async buildStart() {
      await prebuildPromise;
    },
    config(): ViteUserConfig {
      return {
        resolve: {
          extensions: buildExtensions(sourceExtensions ?? DEFAULT_SOURCE_EXTENSIONS, platform),
          mainFields,
          conditions: conditionNames,
          alias,
        },
        test: {
          environment: 'node',
          // Expose `describe` / `it` / `expect` / `jest` without imports
          // so test files written against jest-preset run unchanged.
          globals: true,
          setupFiles: [getSetupFilePath()],
          // The setup file reads ROLLIPOP_VITEST_ROOT when creating a
          // jest-compat shim that resolves `jest.requireActual(id)` from
          // the user's project root.
          env: {
            ROLLIPOP_VITEST_ROOT: root,
          },
        },
      };
    },
    async transform(code, id) {
      // User source goes through the same rollipop chain the bundler uses.
      // Prebuild outputs live under `.rollipop/.vitest/` and are already
      // transformed — don't re-run the chain on them.
      if (id.startsWith(prebuildRoot)) return null;
      const result = await runTransformChain(userChain, code, id, { metaStore });
      if (result == null) return null;
      return { code: result.code, map: result.map as never };
    },
  };
}
