import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { invariant, isNotNil } from 'es-toolkit';

import type { Config } from '../config';
import { logger } from '../logger';

export interface LoadEnvOptions {
  envDir: string;
  envPrefix: string;
  envFile: string;
  mode?: Config['mode'];
}

export function loadEnv(options: LoadEnvOptions) {
  const { envDir, envPrefix, envFile, mode } = options;
  invariant(envPrefix.length > 0, '`envPrefix` is required');
  invariant(envFile.length > 0, '`envFile` is required');

  const env: Record<string, string> = {};
  const envFilesToLoad = [
    envFile,
    `${envFile}.local`,
    mode ? `${envFile}.${mode}` : null,
    mode ? `${envFile}.${mode}.local` : null,
  ].filter(isNotNil);

  for (const file of envFilesToLoad) {
    const envPath = path.resolve(envDir, file);

    if (!fs.existsSync(envPath)) {
      continue;
    }

    logger.trace(`Loading environment variables from ${envPath}`);
    const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
    const expanded = dotenvExpand.expand({
      parsed,
      processEnv: {},
    });

    if (expanded.parsed) {
      Object.entries(expanded.parsed).forEach(([key, value]) => {
        if (key.startsWith(envPrefix)) {
          env[key] = key in process.env ? (process.env[key] as string) : value;
        }
      });
    }
  }

  logger.trace('Loaded environment variables:', env);

  return env;
}
