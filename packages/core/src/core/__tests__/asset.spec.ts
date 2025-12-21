import fs from 'node:fs';

import { describe, it, expect, vitest, beforeAll } from 'vitest';

import { resolveAssetPath, resolveScaledAssets } from '../assets';

vitest.mock('image-size', () => {
  return {
    imageSize: vitest.fn().mockImplementation(() => {
      return {
        width: 100,
        height: 100,
      };
    }),
  };
});

describe('resolveAssetPath', () => {
  describe('when scale is 1', () => {
    describe('when exact asset path is exist', () => {
      it('should return the exact asset path', () => {
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path === assetPath) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        const path = resolveAssetPath(
          assetPath,
          { platform: 'ios', preferNativePlatform: true },
          1,
        );
        expect(path).toBe(assetPath);
      });
    });

    describe('when exact asset path is not exist', () => {
      it('should return the suffixed asset path (platform suffixed)', () => {
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path.toString().includes('@1x')) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        const path = resolveAssetPath(
          assetPath,
          { platform: 'ios', preferNativePlatform: false },
          1,
        );
        expect(path).toBe('back-icon@1x.ios.png');
      });

      it('should return the suffixed asset path (prefer native platform)', () => {
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path.toString().includes('@1x') && path.toString().includes('native')) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        const path = resolveAssetPath(
          assetPath,
          { platform: 'ios', preferNativePlatform: true },
          1,
        );
        expect(path).toBe('back-icon@1x.native.png');
      });

      it('should return the suffixed asset path', () => {
        const platform = 'ios';
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path.toString().includes('@1x') && !path.toString().includes(platform)) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        const path = resolveAssetPath(assetPath, { platform, preferNativePlatform: false }, 1);
        expect(path).toBe('back-icon@1x.png');
      });
    });
  });

  describe('when scale is not 1', () => {
    describe('when exact asset path is exist', () => {
      it('should throw an error if the scaled asset is not exist', () => {
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path === assetPath) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        expect(() =>
          resolveAssetPath(assetPath, { platform: 'ios', preferNativePlatform: true }, 2),
        ).toThrowError();
      });
    });

    describe('when scaled asset is exist', () => {
      it('should return the scaled asset path (platform suffixed)', () => {
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path.toString().includes('@2x')) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        const path = resolveAssetPath(
          assetPath,
          { platform: 'ios', preferNativePlatform: false },
          2,
        );
        expect(path).toBe('back-icon@2x.ios.png');
      });

      it('should return the scaled asset path (prefer native platform)', () => {
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path.toString().includes('@2x') && path.toString().includes('native')) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        const path = resolveAssetPath(
          assetPath,
          { platform: 'ios', preferNativePlatform: true },
          2,
        );
        expect(path).toBe('back-icon@2x.native.png');
      });

      it('should return the suffixed asset path', () => {
        const platform = 'ios';
        const assetPath = 'back-icon.png';
        vitest.spyOn(fs, 'statSync').mockImplementation((path) => {
          if (path.toString().includes('@2x') && !path.toString().includes(platform)) {
            return {} as fs.Stats;
          }
          throw new Error();
        });

        const path = resolveAssetPath(assetPath, { platform, preferNativePlatform: false }, 2);
        expect(path).toBe('back-icon@2x.png');
      });
    });
  });
});

describe('resolveScaledAssets', () => {
  beforeAll(() => {
    vitest.spyOn(fs, 'readFileSync').mockImplementation(() => Buffer.from(''));
  });

  describe('when scaled assets with platform suffix are exist', () => {
    beforeAll(() => {
      vitest
        .spyOn(fs, 'readdirSync')
        .mockImplementation(
          () =>
            [
              'back-icon.png',
              'back-icon@1x.png',
              'back-icon@2x.png',
              'back-icon@3x.png',
              'back-icon@1x.ios.png',
              'back-icon@2x.ios.png',
              'back-icon@3x.ios.png',
            ] as unknown as ReturnType<typeof fs.readdirSync>,
        );
    });

    it('should return the scaled assets with platform suffix', async () => {
      const assets = await resolveScaledAssets({
        projectRoot: '/root',
        assetPath: 'back-icon.png',
        platform: 'ios',
        preferNativePlatform: true,
      });

      expect(assets).toEqual(
        expect.objectContaining({
          files: ['back-icon@1x.ios.png', 'back-icon@2x.ios.png', 'back-icon@3x.ios.png'],
          scales: [1, 2, 3],
        }),
      );
    });
  });

  describe('when scaled assets with native suffix are exist', () => {
    beforeAll(() => {
      vitest
        .spyOn(fs, 'readdirSync')
        .mockImplementation(
          () =>
            [
              'back-icon.png',
              'back-icon@1x.png',
              'back-icon@2x.png',
              'back-icon@3x.png',
              'back-icon@1x.native.png',
              'back-icon@2x.native.png',
              'back-icon@3x.native.png',
            ] as unknown as ReturnType<typeof fs.readdirSync>,
        );
    });

    it('should return the scaled assets with native suffix (prefer native platform)', async () => {
      const assets = await resolveScaledAssets({
        projectRoot: '/root',
        assetPath: 'back-icon.png',
        platform: 'ios',
        preferNativePlatform: true,
      });

      expect(assets).toEqual(
        expect.objectContaining({
          files: ['back-icon@1x.native.png', 'back-icon@2x.native.png', 'back-icon@3x.native.png'],
          scales: [1, 2, 3],
        }),
      );
    });

    it('should return the scaled assets without suffix', async () => {
      const assets = await resolveScaledAssets({
        projectRoot: '/root',
        assetPath: 'back-icon.png',
        platform: 'ios',
        preferNativePlatform: false,
      });

      expect(assets).toEqual(
        expect.objectContaining({
          files: ['back-icon@1x.png', 'back-icon@2x.png', 'back-icon@3x.png'],
          scales: [1, 2, 3],
        }),
      );
    });
  });

  describe('when plain assets are exist', () => {
    beforeAll(() => {
      vitest
        .spyOn(fs, 'readdirSync')
        .mockImplementation(
          () => ['back-icon.png'] as unknown as ReturnType<typeof fs.readdirSync>,
        );
    });

    it('should return the plain asset', async () => {
      const assets = await resolveScaledAssets({
        projectRoot: '/root',
        assetPath: 'back-icon.png',
        platform: 'ios',
        preferNativePlatform: false,
      });

      expect(assets).toEqual(
        expect.objectContaining({
          files: ['back-icon.png'],
          scales: [1],
        }),
      );
    });
  });
});
