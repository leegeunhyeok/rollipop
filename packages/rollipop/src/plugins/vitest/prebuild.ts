/**
 * Prebuild builder for the rollipop vitest integration.
 *
 * vitest is dev-server-like (no bundling) so only the entry module hits
 * rollipop's transform hook. Every transitive `require()` escapes into
 * Node's native CJS loader, which chokes on Flow/TS syntax in untransformed
 * React Native sources. To keep transform-pipeline parity with the bundler
 * we pre-build every file in the matched packages through rollipop's
 * transform chain and stage it under `{root}/.rollipop/.vitest/<pkg>/...`.
 * The vitest plugin then aliases matched package paths to that prebuild
 * directory so Node loads only already-transformed code.
 *
 * For the subset of react-native internals that jest-preset replaces with
 * mock implementations, we follow the same shape: emit a small trampoline
 * under the prebuild that `require()`s the corresponding jest-preset mock
 * file (also prebuilt, so the mock's own Flow/TS syntax is stripped).
 */

import { createRequire } from 'node:module';
import nodeFs from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

import * as swc from '@swc/core';
import pLimit from 'p-limit';

import { runTransformChain } from '../../core/plugins/run-transform-chain';
import type { Plugin } from '../../core/plugins/types';
import { JEST_PRESET_MAPPINGS } from './rn-mock-mappings';
import type { JestPresetMapping } from './rn-mock-mappings';

const JEST_PRESET_PATTERN =
  /^(?:jest-)?react-native$|^@react-native(?:-community)?\/[^/]+$/;

const SOURCE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);

const SKIP_DIRS = new Set([
  'node_modules',
  '__tests__',
  '__mocks__',
  '__fixtures__',
  'example',
  'examples',
  'test',
  'tests',
  'docs',
  'scripts',
]);

export interface PrebuildTarget {
  /** Package specifier, e.g. `react-native`, `@react-native/virtualized-lists`. */
  name: string;
  /** Absolute path of the package root on disk. */
  dir: string;
}

export interface ResolveTargetsOptions {
  /** Extra patterns appended to the built-in jest-preset allow-list. */
  include?: readonly RegExp[];
  /** Patterns whose matches are always dropped, even if `include` hit. */
  exclude?: readonly RegExp[];
}

/**
 * Resolve every prebuild target reachable from `root`:
 *
 *  - Names come from `dependencies` + `devDependencies` of the project
 *    `package.json` at `root`.
 *  - Names are filtered by jest-preset's transform allow-list
 *    (`react-native`, `@react-native/*`, etc.), extended by any caller-
 *    supplied `include` patterns and pruned by `exclude`.
 *  - Each package is located via `require.resolve('<pkg>/package.json',
 *    { paths: [root] })`, which follows the project's own resolution rules
 *    (no guesswork about monorepo layouts).
 */
export function resolvePrebuildTargets(
  root: string,
  options: ResolveTargetsOptions = {},
): PrebuildTarget[] {
  const pkgPath = nodePath.join(root, 'package.json');
  if (!nodeFs.existsSync(pkgPath)) return [];
  const pkgJson = JSON.parse(nodeFs.readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const names = new Set<string>([
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
  ]);
  const include = options.include ?? [];
  const exclude = options.exclude ?? [];
  const require = createRequire(nodePath.join(root, 'noop.js'));
  const targets: PrebuildTarget[] = [];
  for (const name of names) {
    const defaultMatch = JEST_PRESET_PATTERN.test(name);
    const extraMatch = include.some((re) => re.test(name));
    if (!defaultMatch && !extraMatch) continue;
    if (exclude.some((re) => re.test(name))) continue;
    try {
      const resolved = require.resolve(`${name}/package.json`);
      targets.push({ name, dir: nodePath.dirname(resolved) });
    } catch {
      // Package listed in manifest but not installed — skip silently.
    }
  }
  targets.sort((a, b) => a.name.localeCompare(b.name));
  return targets;
}

/** `{root}/.rollipop/.vitest`. */
export function getPrebuildRoot(root: string): string {
  return nodePath.join(root, '.rollipop', '.vitest');
}

export type JestPresetPackage = 'react-native' | '@react-native/jest-preset';

export interface JestPresetSource {
  /** Which package supplies the mocks. */
  packageName: JestPresetPackage;
  /** Absolute path of the directory containing `setup.js` + `mocks/`. */
  dir: string;
}

/**
 * Locate the jest-preset source installed under `root`. Falls back from
 * the legacy in-tree location to the standalone package:
 *
 *   react-native <= 0.84 → `react-native/jest/`
 *   react-native >= 0.85 → `@react-native/jest-preset/`
 *
 * Returns `null` if neither is present; callers decide whether that is
 * fatal (it is when any matched target exists).
 */
export function detectJestPresetSource(root: string): JestPresetSource | null {
  const require = createRequire(nodePath.join(root, 'noop.js'));
  try {
    const legacy = require.resolve('react-native/jest/setup.js');
    return { packageName: 'react-native', dir: nodePath.dirname(legacy) };
  } catch {
    /* fall through */
  }
  try {
    const modern = require.resolve('@react-native/jest-preset/setup.js');
    return { packageName: '@react-native/jest-preset', dir: nodePath.dirname(modern) };
  } catch {
    /* fall through */
  }
  return null;
}

export interface BuildPrebuildOptions {
  root: string;
  chain: Plugin[];
  platform: 'ios' | 'android';
  /**
   * Optional custom prebuild root. Defaults to `getPrebuildRoot(root)`.
   */
  prebuildRoot?: string;
  /**
   * Max files transformed in parallel. Defaults to 16.
   */
  concurrency?: number;
  /**
   * Hash mixed into the per-file cache key so cache invalidates whenever
   * the rollipop config or version changes.
   */
  cacheKey: string;
  /** Extra target patterns, forwarded to `resolvePrebuildTargets`. */
  include?: readonly RegExp[];
  /** Target patterns to exclude, forwarded to `resolvePrebuildTargets`. */
  exclude?: readonly RegExp[];
}

export interface BuildPrebuildResult {
  targets: PrebuildTarget[];
  prebuildRoot: string;
  jestPresetSource: JestPresetSource | null;
  filesTransformed: number;
  filesCached: number;
  filesCopied: number;
  trampolinesWritten: number;
  warnings: string[];
  durationMs: number;
}

/**
 * Walk every target package and write transformed output under the prebuild
 * root. Source layout is preserved so Node's `require()` (which fires
 * inside vitest's module evaluator) resolves transitively within the
 * prebuild directory. Per-file mtime cache skips unchanged sources.
 *
 * After the source pass, emit jest-preset trampolines pointing at the
 * prebuilt mock files so RN internals like `NativeModules` resolve to the
 * jest-preset shape at test time.
 */
export async function buildPrebuild(options: BuildPrebuildOptions): Promise<BuildPrebuildResult> {
  const started = Date.now();
  const prebuildRoot = options.prebuildRoot ?? getPrebuildRoot(options.root);
  const targets = resolvePrebuildTargets(options.root, {
    include: options.include,
    exclude: options.exclude,
  });
  const limit = pLimit(options.concurrency ?? 16);
  const metaStore = new Map<string, Record<string | symbol, unknown>>();

  let filesTransformed = 0;
  let filesCached = 0;
  let filesCopied = 0;
  let trampolinesWritten = 0;
  const warnings: string[] = [];

  await nodeFs.promises.mkdir(prebuildRoot, { recursive: true });

  // swc-transformed output emits `require("@swc/helpers/_/_class_private_field_get")`
  // and friends for private class field helpers. These live in rollipop's
  // own `node_modules` rather than the user's project. Expose them via a
  // symlink inside the prebuild so Node's resolver walking up from
  // transformed files finds them without requiring the user to install
  // `@swc/helpers` themselves.
  await exposeInternalDep(prebuildRoot, '@swc/helpers');

  // Paths whose transformed output must be redirected to a
  // `.__actual.js` sibling so `jest.requireActual` inside jest-preset
  // mocks can still reach the pre-mock implementation (see the shim in
  // `setup.ts`). Only applies when a jest-preset source is present and
  // the target package is react-native.
  const actualSidecarRelPaths = detectJestPresetSource(options.root) != null
    ? new Set(JEST_PRESET_MAPPINGS.map((m) => `${m.from}.js`))
    : new Set<string>();

  for (const target of targets) {
    const outDir = nodePath.join(prebuildRoot, target.name);
    const files = collectPackageFiles(target.dir);
    const plan = planPrebuildFiles(target.dir, files, options.platform);
    const sidecars = target.name === 'react-native' ? actualSidecarRelPaths : new Set<string>();
    await Promise.all(
      plan.map((entry) =>
        limit(async () => {
          const relKey = entry.outRelPath.split(nodePath.sep).join('/');
          const asSidecar = entry.isSource && sidecars.has(relKey);
          const effectiveRel = asSidecar
            ? entry.outRelPath.replace(/\.js$/, '.__actual.js')
            : entry.outRelPath;
          const outFile = nodePath.join(outDir, effectiveRel);
          await nodeFs.promises.mkdir(nodePath.dirname(outFile), { recursive: true });
          if (!entry.isSource) {
            if (await copyIfNewer(entry.src, outFile)) filesCopied += 1;
            return;
          }
          const srcStat = await nodeFs.promises.stat(entry.src);
          const cacheMarker = nodePath.join(
            nodePath.dirname(outFile),
            `.${nodePath.basename(outFile)}.rollipop-cache`,
          );
          const marker = `${srcStat.mtimeMs.toFixed(0)}:${options.cacheKey}`;
          if ((await readMaybe(cacheMarker)) === marker && nodeFs.existsSync(outFile)) {
            filesCached += 1;
            return;
          }
          const source = await nodeFs.promises.readFile(entry.src, 'utf8');
          const result = await runTransformChain(options.chain, source, entry.src, { metaStore });
          const chainOutput = result?.code ?? source;
          // Rollipop's transform chain preserves the original module format
          // (RN's entry is CJS, its leaves are ESM), which rolldown later
          // reconciles during bundling. Without a bundler we normalise to
          // CJS so Node's `require()` path works uniformly across the
          // prebuild directory.
          const outputCode = await normaliseToCjs(chainOutput, entry.src);
          await nodeFs.promises.writeFile(outFile, outputCode, 'utf8');
          await nodeFs.promises.writeFile(cacheMarker, marker, 'utf8');
          filesTransformed += 1;
        }),
      ),
    );
  }

  const jestPresetSource = detectJestPresetSource(options.root);
  if (jestPresetSource != null) {
    const presetOutcome = await writeJestPresetTrampolines({
      prebuildRoot,
      jestPresetSource,
      targets,
    });
    trampolinesWritten = presetOutcome.written;
    warnings.push(...presetOutcome.warnings);
  } else if (targets.some((t) => t.name === 'react-native')) {
    warnings.push(
      'react-native is installed but no jest-preset source was found. ' +
        'For react-native >= 0.85 install @react-native/jest-preset as a dev dependency.',
    );
  }

  return {
    targets,
    prebuildRoot,
    jestPresetSource,
    filesTransformed,
    filesCached,
    filesCopied,
    trampolinesWritten,
    warnings,
    durationMs: Date.now() - started,
  };
}

interface TrampolineOutcome {
  written: number;
  warnings: string[];
}

async function writeJestPresetTrampolines(args: {
  prebuildRoot: string;
  jestPresetSource: JestPresetSource;
  targets: PrebuildTarget[];
}): Promise<TrampolineOutcome> {
  const { prebuildRoot, jestPresetSource, targets } = args;
  const warnings: string[] = [];

  const rnTarget = targets.find((t) => t.name === 'react-native');
  if (rnTarget == null) {
    // Without react-native in the prebuild there is nothing to trampoline
    // from — targets-side aliasing would never hit these paths.
    return { written: 0, warnings };
  }

  const sourceIsInPrebuild = jestPresetSource.packageName === 'react-native' ||
    targets.some((t) => t.name === jestPresetSource.packageName);
  if (!sourceIsInPrebuild) {
    warnings.push(
      `jest-preset source package "${jestPresetSource.packageName}" is not ` +
        'listed in project dependencies; mock files will not be prebuilt. ' +
        'Add it to dependencies or devDependencies.',
    );
    return { written: 0, warnings };
  }

  const validation = validateJestPresetMappings(jestPresetSource, JEST_PRESET_MAPPINGS);
  warnings.push(...validation.warnings);
  if (validation.missing.length > 0) {
    throw new Error(
      `[rollipop/vitest] jest-preset mapping targets not found in ` +
        `${jestPresetSource.packageName}: ${validation.missing.join(', ')}. ` +
        `Installed jest-preset may be incompatible with this rollipop version.`,
    );
  }

  const rnOutDir = nodePath.join(prebuildRoot, 'react-native');
  let written = 0;

  for (const mapping of JEST_PRESET_MAPPINGS) {
    const trampolinePath = nodePath.join(rnOutDir, `${mapping.from}.js`);
    await nodeFs.promises.mkdir(nodePath.dirname(trampolinePath), { recursive: true });

    if (mapping.mockFile == null) {
      // jest-preset automock equivalent: empty exports.
      await nodeFs.promises.writeFile(
        trampolinePath,
        `'use strict';\nmodule.exports = {};\n`,
        'utf8',
      );
      written += 1;
      continue;
    }

    // Resolve the target mock file's prebuild path. For the legacy source
    // this lives inside the react-native prebuild tree; for the modern
    // package it lives inside `@react-native/jest-preset`'s prebuild tree.
    const mockPrebuildAbs =
      jestPresetSource.packageName === 'react-native'
        ? nodePath.join(prebuildRoot, 'react-native', 'jest', `${mapping.mockFile}.js`)
        : nodePath.join(
            prebuildRoot,
            '@react-native',
            'jest-preset',
            `${mapping.mockFile}.js`,
          );

    const requireTarget = nodePath.relative(
      nodePath.dirname(trampolinePath),
      mockPrebuildAbs.replace(/\.js$/, ''),
    );
    const requireExpr = requireTarget.startsWith('.') ? requireTarget : `./${requireTarget}`;

    await nodeFs.promises.writeFile(
      trampolinePath,
      `'use strict';\nmodule.exports = require(${JSON.stringify(requireExpr)});\n`,
      'utf8',
    );
    written += 1;
  }

  return { written, warnings };
}

interface ValidationResult {
  missing: string[];
  warnings: string[];
}

/**
 * Verify that every mock file referenced by the mapping table exists in
 * the detected jest-preset source. As a defence-in-depth check we also
 * count `mock(...)` calls in setup.js and warn if the total diverges
 * sharply from our table — a cheap signal that the installed jest-preset
 * may have added or removed mocks the table does not yet track.
 */
export function validateJestPresetMappings(
  source: JestPresetSource,
  mappings: readonly JestPresetMapping[],
): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const mapping of mappings) {
    if (mapping.mockFile == null) continue;
    const abs = nodePath.join(source.dir, `${mapping.mockFile}.js`);
    if (!nodeFs.existsSync(abs)) missing.push(mapping.mockFile);
  }

  try {
    const setupJs = nodeFs.readFileSync(nodePath.join(source.dir, 'setup.js'), 'utf8');
    const mockCallCount = (setupJs.match(/\bmock\s*\(/g) ?? []).length;
    if (mockCallCount > 0 && Math.abs(mockCallCount - mappings.length) > 2) {
      warnings.push(
        `jest-preset setup.js has ${mockCallCount} mock() calls but the ` +
          `mapping table defines ${mappings.length}; ` +
          `${source.packageName} may have diverged from supported versions.`,
      );
    }
  } catch {
    // setup.js unreadable → skip heuristic, let the file-existence check
    // above catch any real structural drift.
  }

  return { missing, warnings };
}

interface PlannedEntry {
  /** Absolute path of the source file to read. */
  src: string;
  /** Relative path (from prebuild package dir) to write to. */
  outRelPath: string;
  /** Whether to run the transform chain (`.js/.ts`) or copy as-is. */
  isSource: boolean;
}

/**
 * Decide which concrete file to emit for each logical module, preferring
 * platform-specific variants exactly like Metro's / jest-preset's haste
 * resolver: `Foo.ios.js` > `Foo.native.js` > `Foo.js`. The winner is always
 * written to the prebuild as the plain `Foo.js` (or `Foo.ts` etc.) so both
 * Node's CJS `require()` and vite's ESM resolver find it without needing
 * extension awareness at runtime.
 */
function planPrebuildFiles(
  pkgDir: string,
  files: string[],
  platform: 'ios' | 'android',
): PlannedEntry[] {
  const PLATFORM_PREFERENCE = [`.${platform}`, '.native', ''];
  const candidates = new Map<string, Map<string, string>>();
  const nonSource: string[] = [];

  for (const file of files) {
    const ext = nodePath.extname(file);
    const base = nodePath.basename(file);
    if (!SOURCE_EXTS.has(ext) || base.endsWith('.d.ts')) {
      nonSource.push(file);
      continue;
    }
    const rel = nodePath.relative(pkgDir, file);
    const { logicalRel, suffix } = parsePlatformSuffix(rel);
    let bucket = candidates.get(logicalRel);
    if (bucket == null) {
      bucket = new Map();
      candidates.set(logicalRel, bucket);
    }
    bucket.set(suffix, file);
  }

  const plan: PlannedEntry[] = [];
  for (const [logicalRel, bucket] of candidates) {
    let winner: string | null = null;
    for (const suffix of PLATFORM_PREFERENCE) {
      const hit = bucket.get(suffix);
      if (hit != null) {
        winner = hit;
        break;
      }
    }
    if (winner == null) continue;
    plan.push({ src: winner, outRelPath: logicalRel, isSource: true });
  }
  for (const file of nonSource) {
    plan.push({ src: file, outRelPath: nodePath.relative(pkgDir, file), isSource: false });
  }
  return plan;
}

/**
 * Split `foo/Bar.ios.js` into `{ logicalRel: 'foo/Bar.js', suffix: '.ios' }`.
 * Only the immediate suffix matters — `foo.native.tsx` strips `.native` only.
 */
function parsePlatformSuffix(relPath: string): { logicalRel: string; suffix: string } {
  const ext = nodePath.extname(relPath);
  const stem = relPath.slice(0, -ext.length);
  const match = /\.(ios|android|native)$/.exec(stem);
  if (match == null) {
    return { logicalRel: relPath, suffix: '' };
  }
  const logicalStem = stem.slice(0, -match[0].length);
  return { logicalRel: `${logicalStem}${ext}`, suffix: match[0] };
}

/**
 * Make an internally-installed dependency resolvable from prebuilt files
 * without forcing the user project to list it. The dep is located from
 * this plugin's own install location (where rollipop's `node_modules`
 * live) and exposed at `{prebuildRoot}/node_modules/{depName}`. Node's
 * CJS resolver, walking up from any transformed file under
 * `prebuildRoot`, reaches that copy before hitting the user project's
 * node_modules.
 */
async function exposeInternalDep(prebuildRoot: string, depName: string): Promise<void> {
  const pluginRequire = createRequire(fileURLToPath(import.meta.url));
  let depDir: string;
  try {
    const pkgJson = pluginRequire.resolve(`${depName}/package.json`);
    depDir = nodePath.dirname(pkgJson);
  } catch {
    // Not installed in rollipop's tree — nothing to do.
    return;
  }
  const linkPath = nodePath.join(prebuildRoot, 'node_modules', depName);
  await nodeFs.promises.mkdir(nodePath.dirname(linkPath), { recursive: true });
  try {
    const existing = await nodeFs.promises.readlink(linkPath);
    if (existing === depDir) return;
    await nodeFs.promises.unlink(linkPath);
  } catch {
    // No existing link or a regular file — remove if present, then link.
    try {
      await nodeFs.promises.rm(linkPath, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  try {
    await nodeFs.promises.symlink(depDir, linkPath, 'junction');
  } catch {
    // On platforms without symlink support, fall back to a plain copy.
    await nodeFs.promises.cp(depDir, linkPath, { recursive: true });
  }
}

async function normaliseToCjs(code: string, filename: string): Promise<string> {
  const result = await swc.transform(code, {
    filename,
    configFile: false,
    swcrc: false,
    sourceMaps: false,
    isModule: 'unknown',
    module: { type: 'commonjs' },
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      target: 'es2020',
    },
  });
  return result.code;
}

function collectPackageFiles(pkgDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [pkgDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir == null) break;
    let entries: nodeFs.Dirent[];
    try {
      entries = nodeFs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(nodePath.join(dir, entry.name));
        continue;
      }
      if (entry.isFile()) {
        out.push(nodePath.join(dir, entry.name));
      }
    }
  }
  return out;
}

async function readMaybe(file: string): Promise<string | null> {
  try {
    return await nodeFs.promises.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function copyIfNewer(src: string, dst: string): Promise<boolean> {
  try {
    const [srcStat, dstStat] = await Promise.all([
      nodeFs.promises.stat(src),
      nodeFs.promises.stat(dst).catch(() => null),
    ]);
    if (dstStat != null && dstStat.mtimeMs >= srcStat.mtimeMs) return false;
    await nodeFs.promises.copyFile(src, dst);
    return true;
  } catch {
    return false;
  }
}
