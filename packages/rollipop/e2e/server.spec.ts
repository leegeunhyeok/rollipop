import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';

import { loadConfig } from '../src/config';
import { GLOBAL_IDENTIFIER } from '../src/constants';
import type { DevServer } from '../src/server/types';
import { runServer } from '../src/utils/run-server';

const EXAMPLE_DIR = path.resolve(import.meta.dirname, '../../../examples/0.84');
const PORT = 10321 + Math.floor(Math.random() * 1000);
const HOST = 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

let server: DevServer;

beforeAll(async () => {
  const config = await loadConfig({
    cwd: EXAMPLE_DIR,
    mode: 'development',
  });

  // Resolve entry to absolute path (prelude plugin reads entry via fs.readFileSync)
  (config as any).entry = path.resolve(config.root, config.entry);

  server = await runServer(config, {
    port: PORT,
    host: HOST,
    buildOptions: { cache: false },
  });
});

afterAll(async () => {
  await server?.instance.close();
});

describe('dev server', () => {
  it('GET /status returns packager-status:running', async () => {
    const res = await fetch(`${BASE_URL}/status`);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('packager-status:running');
    // X-React-Native-Project-Root is set by the community middleware
    expect(res.headers.get('X-React-Native-Project-Root')).toBeTruthy();
  });

  describe('bundle serving', () => {
    it('GET /index.bundle?platform=ios&dev=true returns valid JS bundle', async () => {
      const res = await fetch(`${BASE_URL}/index.bundle?platform=ios&dev=true`);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/javascript');

      const code = await res.text();
      expect(code.length).toBeGreaterThan(0);
    }, 120_000);

    it('GET /index.bundle?platform=android&dev=true returns valid JS bundle', async () => {
      const res = await fetch(`${BASE_URL}/index.bundle?platform=android&dev=true`);

      expect(res.status).toBe(200);
      const code = await res.text();
      expect(code.length).toBeGreaterThan(0);
    }, 120_000);

    it('GET /index.bundle?platform=ios&dev=false returns production bundle', async () => {
      const res = await fetch(`${BASE_URL}/index.bundle?platform=ios&dev=false`);

      expect(res.status).toBe(200);
      const code = await res.text();
      expect(code.length).toBeGreaterThan(0);
    }, 120_000);
  });

  describe('bundle content - development', () => {
    let code: string;

    beforeAll(async () => {
      const res = await fetch(`${BASE_URL}/index.bundle?platform=ios&dev=true`);
      code = await res.text();
    }, 120_000);

    it('contains InitializeCore import (prelude)', () => {
      expect(code).toContain('InitializeCore');
    });

    it('contains __DEV__ = true in development mode', () => {
      expect(code).toContain('var __DEV__=true');
    });

    it('contains global identifier definition', () => {
      expect(code).toContain(`var ${GLOBAL_IDENTIFIER}=typeof globalThis`);
    });

    it('contains __BUNDLE_START_TIME__ for performance tracking', () => {
      expect(code).toContain('__BUNDLE_START_TIME__');
    });

    it('contains process.env.NODE_ENV = "development"', () => {
      expect(code).toContain('NODE_ENV=process.env.NODE_ENV||"development"');
    });

    it('contains React Refresh stubs ($RefreshReg$, $RefreshSig$)', () => {
      expect(code).toContain('$RefreshReg$');
      expect(code).toContain('$RefreshSig$');
    });

    it('contains AppRegistry from user entry', () => {
      expect(code).toContain('AppRegistry');
    });

    it('contains polyfill code from react-native', () => {
      // react-native polyfills are injected as IIFE
      expect(code).toMatch(/\(function\s*\(global\)/);
    });

    it('contains import.meta.env.MODE = "development"', () => {
      expect(code).toContain('"development"');
    });
  });

  describe('bundle content - production', () => {
    let code: string;

    beforeAll(async () => {
      const res = await fetch(`${BASE_URL}/index.bundle?platform=ios&dev=false`);
      code = await res.text();
    }, 120_000);

    it('contains __DEV__ = false in production mode', () => {
      expect(code).toContain('var __DEV__=false');
    });

    it('contains process.env.NODE_ENV = "production"', () => {
      expect(code).toContain('NODE_ENV=process.env.NODE_ENV||"production"');
    });

    it('does NOT contain React Refresh stubs in production', () => {
      // $RefreshReg$ and $RefreshSig$ should only be in dev+serve mode
      // production builds should not have them in the global intro
      expect(code).not.toMatch(/^var \$RefreshReg\$/m);
    });
  });

  describe('bundle content - platform difference', () => {
    let iosCode: string;
    let androidCode: string;

    beforeAll(async () => {
      const [iosRes, androidRes] = await Promise.all([
        fetch(`${BASE_URL}/index.bundle?platform=ios&dev=true`),
        fetch(`${BASE_URL}/index.bundle?platform=android&dev=true`),
      ]);
      iosCode = await iosRes.text();
      androidCode = await androidRes.text();
    }, 120_000);

    it('both platforms produce valid bundles', () => {
      expect(iosCode.length).toBeGreaterThan(1000);
      expect(androidCode.length).toBeGreaterThan(1000);
    });

    it('both platforms contain core React Native code', () => {
      expect(iosCode).toContain('AppRegistry');
      expect(androidCode).toContain('AppRegistry');
    });
  });

  describe('source map serving', () => {
    it('GET /index.map?platform=ios&dev=true returns valid source map', async () => {
      // Ensure bundle is built first
      await fetch(`${BASE_URL}/index.bundle?platform=ios&dev=true`);

      const res = await fetch(`${BASE_URL}/index.map?platform=ios&dev=true`);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');

      const map = (await res.json()) as Record<string, unknown>;
      expect(map.version).toBe(3);
      expect(map.sources).toBeDefined();
      expect(Array.isArray(map.sources)).toBe(true);
      expect((map.sources as unknown[]).length).toBeGreaterThan(0);
      expect(map.mappings).toBeDefined();
    }, 120_000);
  });

  describe('error handling', () => {
    it('returns non-200 for missing platform parameter', async () => {
      const res = await fetch(`${BASE_URL}/index.bundle`);

      // Fastify schema validation or server error for missing required param
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
