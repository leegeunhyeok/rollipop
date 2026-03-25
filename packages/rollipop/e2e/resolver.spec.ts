import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';

import { build, fixturePath } from './helpers';

describe('resolver', () => {
  describe('platform suffix', () => {
    it('resolves .android.ts when platform is android', async () => {
      const chunk = await build('resolver/platform-suffix', {
        resolver: { preferNativePlatform: true },
      });

      expect(chunk.code).toContain('"android"');
      expect(chunk.code).not.toContain('"native"');
      expect(chunk.code).not.toContain('"base"');
    });

    it('resolves .ios.ts when platform is ios', async () => {
      const chunk = await build(
        'resolver/platform-suffix',
        { resolver: { preferNativePlatform: true } },
        { platform: 'ios' },
      );

      expect(chunk.code).toContain('"ios"');
      expect(chunk.code).not.toContain('"android"');
      expect(chunk.code).not.toContain('"base"');
    });

    it('falls back to .native.ts when platform file is missing', async () => {
      const chunk = await build(
        'resolver/platform-suffix',
        { resolver: { preferNativePlatform: true } },
        { platform: 'windows' },
      );

      expect(chunk.code).toContain('"native"');
      expect(chunk.code).not.toContain('"base"');
    });

    it('skips .native.ts when preferNativePlatform is false', async () => {
      const chunk = await build(
        'resolver/platform-suffix',
        { resolver: { preferNativePlatform: false } },
        { platform: 'windows' },
      );

      expect(chunk.code).toContain('"base"');
      expect(chunk.code).not.toContain('"native"');
    });
  });

  describe('alias', () => {
    it('resolves aliased module paths', async () => {
      const chunk = await build('resolver/alias', {
        resolver: {
          alias: {
            '@src': path.join(fixturePath('resolver/alias'), 'src'),
          },
        },
      });

      expect(chunk.code).toContain('hello');
      expect(chunk.code).not.toContain('@src');
    });
  });

  // node_modules dirs are created dynamically (gitignore blocks committing them)
  describe('condition names', () => {
    const fixtureRoot = fixturePath('resolver/condition-names');
    const pkgDir = path.join(fixtureRoot, 'node_modules', 'test-pkg');

    beforeAll(() => {
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-pkg',
          exports: {
            '.': {
              'react-native': './react-native.js',
              import: './esm.js',
              default: './default.js',
            },
          },
        }),
      );
      fs.writeFileSync(
        path.join(pkgDir, 'react-native.js'),
        "export const source = 'react-native';",
      );
      fs.writeFileSync(path.join(pkgDir, 'esm.js'), "export const source = 'esm';");
      fs.writeFileSync(path.join(pkgDir, 'default.js'), "export const source = 'default';");
    });

    afterAll(() => {
      fs.rmSync(path.join(fixtureRoot, 'node_modules'), { recursive: true, force: true });
    });

    it('prefers react-native condition over import/require', async () => {
      const chunk = await build('resolver/condition-names', {
        resolver: { conditionNames: ['react-native', 'import', 'require'] },
      });

      expect(chunk.code).toContain('"react-native"');
      expect(chunk.code).not.toContain('"esm"');
    });

    it('uses import condition when react-native is not configured', async () => {
      const chunk = await build('resolver/condition-names', {
        resolver: { conditionNames: ['import', 'require'] },
      });

      expect(chunk.code).toContain('"esm"');
      expect(chunk.code).not.toContain('"react-native"');
    });
  });

  describe('main fields', () => {
    const fixtureRoot = fixturePath('resolver/main-fields');
    const pkgDir = path.join(fixtureRoot, 'node_modules', 'test-mf-pkg');

    beforeAll(() => {
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({
          name: 'test-mf-pkg',
          'react-native': './react-native.js',
          browser: './browser.js',
          main: './main.js',
        }),
      );
      fs.writeFileSync(
        path.join(pkgDir, 'react-native.js'),
        "export const source = 'react-native-field';",
      );
      fs.writeFileSync(path.join(pkgDir, 'browser.js'), "export const source = 'browser-field';");
      fs.writeFileSync(path.join(pkgDir, 'main.js'), "export const source = 'main-field';");
    });

    afterAll(() => {
      fs.rmSync(path.join(fixtureRoot, 'node_modules'), { recursive: true, force: true });
    });

    it('prefers react-native field over browser and main', async () => {
      const chunk = await build('resolver/main-fields', {
        resolver: { mainFields: ['react-native', 'browser', 'main'] },
      });

      expect(chunk.code).toContain('react-native-field');
      expect(chunk.code).not.toContain('browser-field');
      expect(chunk.code).not.toContain('main-field');
    });

    it('uses browser field when react-native is not in mainFields', async () => {
      const chunk = await build('resolver/main-fields', {
        resolver: { mainFields: ['browser', 'main'] },
      });

      expect(chunk.code).toContain('browser-field');
      expect(chunk.code).not.toContain('react-native-field');
    });

    it('uses main field as last fallback', async () => {
      const chunk = await build('resolver/main-fields', {
        resolver: { mainFields: ['main'] },
      });

      expect(chunk.code).toContain('main-field');
    });
  });

  describe('external', () => {
    it('string pattern marks module as external', async () => {
      const chunk = await build('resolver/alias', {
        resolver: {
          alias: {
            '@src': path.join(fixturePath('resolver/alias'), 'src'),
          },
          external: ['@src/util'],
        },
      });

      expect(chunk.code).toMatch(/import.*@src\/util/);
    });

    it('regex pattern marks matching modules as external', async () => {
      const chunk = await build('resolver/alias', {
        resolver: {
          alias: {
            '@src': path.join(fixturePath('resolver/alias'), 'src'),
          },
          external: [/^@src/],
        },
      });

      expect(chunk.code).toMatch(/import.*@src/);
    });
  });
});
