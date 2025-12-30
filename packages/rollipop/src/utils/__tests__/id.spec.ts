import { describe, it, expect } from 'vitest';

import { createId } from '../id';

describe('createId', () => {
  const BUILD_OPTIONS = { platform: 'ios', dev: true } as const;

  it('should return the same id', () => {
    const configA: any = {
      transformer: {
        define: {
          __DEV__: 'true',
        },
      },
      plugins: [{ name: 'plugin-a' }, { name: 'plugin-b' }],
    };

    const configB: any = {
      transformer: {
        define: {
          __DEV__: 'true',
        },
      },
      plugins: [{ name: 'plugin-a' }, { name: 'plugin-b' }],
    };

    const idA = createId(configA, BUILD_OPTIONS);
    const idB = createId(configB, BUILD_OPTIONS);

    expect(idA === idB).toBe(true);
  });

  it('should return different id', () => {
    const configA: any = {
      transformer: {
        define: {
          __DEV__: 'true',
        },
      },
      plugins: [{ name: 'plugin-a' }, { name: 'plugin-b' }],
    };

    const configB: any = {
      transformer: {
        define: {
          __DEV__: 'true',
        },
      },
      plugins: [{ name: 'plugin-b' }, { name: 'plugin-a' }], // different order
    };

    const configC: any = {
      transformer: {
        define: {
          __DEV__: 'false', // different value
        },
      },
      plugins: [{ name: 'plugin-a' }, { name: 'plugin-b' }],
    };

    const idA = createId(configA, BUILD_OPTIONS);
    const idB = createId(configB, BUILD_OPTIONS);
    const idC = createId(configC, BUILD_OPTIONS);

    expect(idA === idB).toBe(false);
    expect(idA === idC).toBe(false);
    expect([idA, idB, idC]).toMatchInlineSnapshot(`
      [
        "a51f71b1ebbc0ec402cca39fca1ee0fb",
        "9fb48e2c0a3590d871b1bc03b7c06b87",
        "024e36042c5e06b9b33d43a560934b59",
      ]
    `);
  });
});
