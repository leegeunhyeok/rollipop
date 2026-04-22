/**
 * Public entry for the rollipop vitest integration.
 *
 * Consumed as `import { vitest } from 'rollipop/vitest'`. The concrete
 * implementation lives under `./plugins/vitest` and is re-exported here so
 * the public surface stays a single subpath regardless of how internal
 * files are organised.
 */

export { vitest } from './plugins/vitest';
export type { Platform, VitestPluginOptions } from './plugins/vitest';
