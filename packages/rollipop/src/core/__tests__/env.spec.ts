import fs from 'node:fs';
import path from 'node:path';

import { describe, it, expect, vitest, beforeEach } from 'vite-plus/test';

import { DEFAULT_ENV_FILE, DEFAULT_ENV_PREFIX } from '../../constants';
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

    const env = loadEnv({
      envDir: '.',
      envFile: DEFAULT_ENV_FILE,
      envPrefix: DEFAULT_ENV_PREFIX,
    });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should load environment variables from .env.local', () => {
    mockEnvFiles({
      '.env.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
    });

    const env = loadEnv({
      envDir: '.',
      envFile: DEFAULT_ENV_FILE,
      envPrefix: DEFAULT_ENV_PREFIX,
    });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should load environment variables from .env.[mode]', () => {
    mockEnvFiles({
      '.env.development': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
    });

    const env = loadEnv({
      envDir: '.',
      envFile: DEFAULT_ENV_FILE,
      envPrefix: DEFAULT_ENV_PREFIX,
      mode: 'development',
    });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should load environment variables from `.env.[mode].local`', () => {
    mockEnvFiles({
      '.env.development.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
    });

    const env = loadEnv({
      envDir: '.',
      envFile: DEFAULT_ENV_FILE,
      envPrefix: DEFAULT_ENV_PREFIX,
      mode: 'development',
    });
    expect(env).toEqual({ ROLLIPOP_FOO: '1', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '3' });
  });

  it('should override environment variables from `.env.local` with `.env.[mode].local`', () => {
    mockEnvFiles({
      '.env.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2', 'ROLLIPOP_BAZ=3'].join('\n'),
      '.env.development.local': ['ROLLIPOP_FOO=4', 'ROLLIPOP_BAR=5'].join('\n'),
    });

    const env = loadEnv({
      envDir: '.',
      envFile: DEFAULT_ENV_FILE,
      envPrefix: DEFAULT_ENV_PREFIX,
      mode: 'development',
    });
    expect(env).toEqual({ ROLLIPOP_FOO: '4', ROLLIPOP_BAR: '5', ROLLIPOP_BAZ: '3' });
  });

  it('should override environment variables order: `.env` -> `.env.local` -> `.env.[mode]` -> `.env.[mode].local`', () => {
    mockEnvFiles({
      '.env': ['ROLLIPOP_FOO=0'].join('\n'),
      '.env.local': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2'].join('\n'),
      '.env.development': ['ROLLIPOP_FOO=7'].join('\n'),
      '.env.development.local': ['ROLLIPOP_BAZ=6'].join('\n'),
    });

    const env = loadEnv({
      envDir: '.',
      envFile: DEFAULT_ENV_FILE,
      envPrefix: DEFAULT_ENV_PREFIX,
      mode: 'development',
    });
    expect(env).toEqual({ ROLLIPOP_FOO: '7', ROLLIPOP_BAR: '2', ROLLIPOP_BAZ: '6' });
  });

  describe('with custom envFile basename', () => {
    it('should resolve files using the custom basename', () => {
      mockEnvFiles({
        '.env': ['ROLLIPOP_FOO=ignored'].join('\n'),
        '.rollipop-env': ['ROLLIPOP_FOO=1', 'ROLLIPOP_BAR=2'].join('\n'),
        '.rollipop-env.local': ['ROLLIPOP_FOO=3'].join('\n'),
        '.rollipop-env.development': ['ROLLIPOP_BAR=4'].join('\n'),
      });

      const env = loadEnv({
        envDir: '.',
        envFile: '.rollipop-env',
        envPrefix: DEFAULT_ENV_PREFIX,
        mode: 'development',
      });
      expect(env).toEqual({ ROLLIPOP_FOO: '3', ROLLIPOP_BAR: '4' });
    });

    it('should silently skip when no matching files exist', () => {
      mockEnvFiles({
        '.env': ['ROLLIPOP_FOO=ignored'].join('\n'),
      });

      const env = loadEnv({
        envDir: '.',
        envFile: '.rollipop-env',
        envPrefix: DEFAULT_ENV_PREFIX,
      });
      expect(env).toEqual({});
    });
  });
});
