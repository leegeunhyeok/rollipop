import { resetCache } from '@rollipop/common';
import { loadConfig } from '@rollipop/core';

import { runBuild } from './run-build';
import { runServer } from './run-server';

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

export { Rollipop };

// Re-export `@rollipop/core`
export {
  defineConfig,
  mergeConfig,
  type Config,
  type ResolvedConfig,
  type DefaultConfig,
  type ResolverConfig,
  type TransformerConfig,
  type SerializerConfig,
  type WatcherConfig,
  type ReactNativeConfig,
  type TerminalConfig,
  type RolldownConfig,
  type BuildOptions,
} from '@rollipop/core';

// Re-export `@rollipop/dev-server`
export {
  DEFAULT_HOST,
  DEFAULT_PORT,
  type ServerOptions,
  type DevServer,
  type Reporter,
  type TerminalReportableEvent,
  type ReportableEvent,
} from '@rollipop/dev-server';
