import fs from 'node:fs';
import path from 'node:path';

import { describe, it, expect, vitest, beforeEach } from 'vitest';

import { DEFAULT_ENV_PREFIX } from '../../constants';
import { loadEnv } from '../env';

describe('loadEnv', () => {
  function mockEnvFiles(files: Record<string, string>) {
    vitest.spyOn(fs, 'existsSync').mockImplementation((pathLike) => {
      return Boolean(files[path.basename(pathLike.toString())]);
    });

    vitest.spyOn(fs, 'readFileSync').mockImplementation((pathLike) => {
      return files[path.basename(pathLike.toString())];
    });
  }

  beforeEach(() => {
    vitest.resetAllMocks();
  });

  it('should load environment variables', () => {
    mockEnvFiles({
      '.env': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
    });

    const env = loadEnv({ envDir: '.', envPrefix: DEFAULT_ENV_PREFIX });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should load environment variables from .env.local', () => {
    mockEnvFiles({
      '.env.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
    });

    const env = loadEnv({ envDir: '.', envPrefix: DEFAULT_ENV_PREFIX });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should load environment variables from .env.[mode]', () => {
    mockEnvFiles({
      '.env.development': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
    });

    const env = loadEnv({ envDir: '.', envPrefix: DEFAULT_ENV_PREFIX, mode: 'development' });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should load environment variables from `.env.[mode].local`', () => {
    mockEnvFiles({
      '.env.development.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
    });

    const env = loadEnv({ envDir: '.', envPrefix: DEFAULT_ENV_PREFIX, mode: 'development' });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should override environment variables from `.env.local` with `.env.[mode].local`', () => {
    mockEnvFiles({
      '.env.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
      '.env.development.local': ['ROLLIPOP_FOO=4', 'ROLLIPOP_BAR=5'].join('\n'),
    });

    const env = loadEnv({ envDir: '.', envPrefix: DEFAULT_ENV_PREFIX, mode: 'development' });
    expect(env).toEqual({ ROLLIPOP_FOO: '4', ROLLIPOP_BAR: '5', ROLLIPOP_BAZ: '3' });
  });

  it('should override environment variables order: `.env` -> `.env.local` -> `.env.[mode].local` -> `.env.[mode]`', () => {
    mockEnvFiles({
      '.env': ['ROLLIPOP_FOO=0'].join('\n'),
      '.env.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2'].join('\n'),
      '.env.development': ['ROLLIPOP_FOO=7'].join('\n'),
      '.env.development.local': ['ROLLIPOP_BAZ=6'].join('\n'),
    });

    const env = loadEnv({ envDir: '.', envPrefix: DEFAULT_ENV_PREFIX, mode: 'development' });
    expect(env).toEqual({ ROLLIPOP_FOO: '7', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '6' });
  });
});
