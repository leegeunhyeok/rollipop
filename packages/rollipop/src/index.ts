import { loadConfig } from './config';
import { resetCache } from './utils/reset-cache';
import { runBuild } from './utils/run-build';
import { runServer } from './utils/run-server';

interface Rollipop {
  readonly runBuild: typeof runBuild;
  readonly runServer: typeof runServer;
  readonly loadConfig: typeof loadConfig;
  readonly resetCache: typeof resetCache;
}

const Rollipop: Rollipop = Object.freeze({
  runBuild,
  runServer,
  loadConfig,
  resetCache,
});

// Rollipop namespace
export { Rollipop };

// Bundler
export { Bundler } from './core/bundler';
export type * from './core/types';

// Dev server
export * from './server';

// Plugins
export * as plugins from './core/plugins';
export type { Plugin, PluginConfig } from './core/plugins/types';

// Assets
export * as AssetUtils from './core/assets';

// Config
export * from './config';

// Types
export type * from './types';
export type * from './types/hmr';

// CLI
export * as cli from './node/cli';

// Re-export `rolldown`
export * as rolldown from 'rolldown';
export * as rolldownExperimental from 'rolldown/experimental';
