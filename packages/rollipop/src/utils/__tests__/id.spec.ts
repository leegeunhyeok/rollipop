import { describe, it, expect } from 'vite-plus/test';

import { createTestConfig } from '../../testing/config';
import { createId } from '../id';

describe('createId', () => {
  const BUILD_OPTIONS = { platform: 'ios', dev: true } as const;

  it('should return the same id', () => {
    const configA = createTestConfig('/root');
    const configB = createTestConfig('/root');

    configA.plugins = [{ name: 'plugin-a' }, { name: 'plugin-b' }];
    configB.plugins = [{ name: 'plugin-a' }, { name: 'plugin-b' }];

    const idA = createId(configA, BUILD_OPTIONS);
    const idB = createId(configB, BUILD_OPTIONS);

    expect(idA === idB).toBe(true);
  });

  it('should return different id', () => {
    const configA = createTestConfig('/root');
    const configB = createTestConfig('/root');
    const configC = createTestConfig('/root');

    configA.plugins = [{ name: 'plugin-a' }, { name: 'plugin-b' }];
    configB.plugins = [{ name: 'plugin-b' }, { name: 'plugin-a' }]; // different order
    configB.transformer.define = { __DEV__: 'false' }; // different value

    const idA = createId(configA, BUILD_OPTIONS);
    const idB = createId(configB, BUILD_OPTIONS);
    const idC = createId(configC, BUILD_OPTIONS);

    expect(idA === idB).toBe(false);
    expect(idA === idC).toBe(false);
    expect([idA, idB, idC]).toMatchInlineSnapshot(`
    	[
    	  "9eebe4b0603fff0acc79c6333e404daf",
    	  "1e8fa7012e1d43834a786bf0c6e7283f",
    	  "39662042520373564bd2d06a47adfb62",
    	]
    `);
  });
});
