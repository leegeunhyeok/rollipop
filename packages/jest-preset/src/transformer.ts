import { createHash } from 'node:crypto';
import path from 'node:path';

import { Constants, loadEnv, rolldownExperimental } from 'rollipop';

import { defineEnvFromObject } from './env';

export interface TransformerOptions {
  mode?: 'development' | 'production';
  root?: string;
  runtimeTarget?: rolldownExperimental.RollipopReactNativeRuntimeTarget;
  flow?: rolldownExperimental.RollipopReactNativeFlowConfig;
  worklets?: rolldownExperimental.RollipopReactNativeWorkletsConfig;
  envDir?: string;
  envFile?: string;
  envPrefix?: string;
}

interface JestTransformOutput {
  code: string;
  map?: string;
}

interface JestSyncTransformer {
  canInstrument: false;
  process(sourceText: string, sourcePath: string): JestTransformOutput;
  processAsync(sourceText: string, sourcePath: string): Promise<JestTransformOutput>;
  getCacheKey(sourceText: string, sourcePath: string): string;
}

function resolveMode(
  mode = process.env.NODE_ENV as TransformerOptions['mode'],
): Required<TransformerOptions['mode']> {
  switch (mode) {
    case 'development':
    case 'production':
      return mode;
    default:
      return 'development';
  }
}

function packageVersion(): string {
  try {
    const pkg = require(path.join(__dirname, '..', 'package.json')) as { version: string };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

export function createTransformer(options: TransformerOptions = {}): JestSyncTransformer {
  const mode = resolveMode(options.mode);
  const env = loadEnv({
    envDir: options.root ?? process.cwd(),
    envFile: options.envFile ?? Constants.DEFAULT_ENV_FILE,
    envPrefix: options.envPrefix ?? Constants.DEFAULT_ENV_PREFIX,
    mode,
  });
  const pipeline = new rolldownExperimental.RollipopReactNativeTransformer({
    envName: mode,
    runtimeTarget: options.runtimeTarget,
    swc: {
      globals: {
        'import.meta.hot': 'undefined',
        'import.meta.env': JSON.stringify({}),
        // User envs
        ...defineEnvFromObject(env),
        // Built-in envs
        ...defineEnvFromObject({ MODE: mode }),
      },
      react: {
        development: mode === 'development',
        runtime: 'Automatic',
      },
      module: { type: 'commonjs' },
    },
    flow: options.flow,
    worklets: options.worklets,
  });
  const optionsHash = createHash('sha1')
    .update(JSON.stringify({ version: packageVersion(), options }))
    .digest('hex')
    .slice(0, 16);

  return {
    canInstrument: false,
    process(sourceText, sourcePath): JestTransformOutput {
      const result = pipeline.transformSync(sourcePath, sourceText);
      return { code: result.code, ...(result.map != null ? { map: result.map } : null) };
    },
    async processAsync(sourceText, sourcePath): Promise<JestTransformOutput> {
      const result = await pipeline.transform(sourcePath, sourceText);
      return { code: result.code, ...(result.map != null ? { map: result.map } : null) };
    },

    getCacheKey(sourceText, sourcePath): string {
      return createHash('sha1')
        .update(optionsHash)
        .update('\0')
        .update(sourcePath)
        .update('\0')
        .update(sourceText)
        .digest('hex');
    },
  };
}
