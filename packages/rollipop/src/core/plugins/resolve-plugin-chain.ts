import type { ResolvedConfig } from '../../config';
import { flattenPluginOption } from '../../config/load-config';
import { resolveBuildOptions } from '../../utils/build-options';
import { Bundler } from '../bundler';
import { FileStorage } from '../fs/storage';
import { resolveRolldownOptions } from '../rolldown';
import type { BuildOptions, BundlerContext, BundlerState, BuildType, DevEngineOptions } from '../types';
import type { Plugin } from './types';

export interface ResolvePluginChainOptions {
  /**
   * Which build flavour the caller is about to run. Determines which
   * built-in plugins are included — e.g. the react-refresh wrapper is only
   * enabled for `serve` + dev.
   * @default 'build'
   */
  buildType?: BuildType;
  /**
   * Required when `buildType === 'serve'` (dev-server mode) — passes the
   * host/port down to plugins that embed the dev-server URL. Ignored
   * otherwise.
   */
  devEngineOptions?: DevEngineOptions;
}

/**
 * Return rollipop's complete, flattened plugin chain for the given config
 * and build options — exactly what the bundler would hand to rolldown,
 * built-ins (prelude / react-native / json / svg / babel / swc / reporter)
 * followed by user-supplied plugins.
 *
 * Useful when a caller (for example the `vitest()` plugin) wants to reuse
 * the same transform pipeline outside the bundler itself.
 */
export async function resolvePluginChain(
  config: ResolvedConfig,
  buildOptions: BuildOptions,
  options: ResolvePluginChainOptions = {},
): Promise<Plugin[]> {
  const { buildType = 'build', devEngineOptions } = options;
  const resolvedBuildOptions = resolveBuildOptions(config, buildOptions);

  const context: BundlerContext = {
    id: Bundler.createId(config, resolvedBuildOptions),
    root: config.root,
    storage: FileStorage.getInstance(config.root),
    buildType,
    state: { hmrUpdates: new Set() },
  };

  const { input } = await resolveRolldownOptions(
    context,
    config,
    resolvedBuildOptions,
    devEngineOptions,
  );

  return flattenPluginOption(
    (input?.plugins ?? []) as Parameters<typeof flattenPluginOption>[0],
  );
}
