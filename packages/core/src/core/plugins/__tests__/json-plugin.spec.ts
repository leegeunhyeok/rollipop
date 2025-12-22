import fs from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { testPluginDriver } from '../../../testing/plugin-testing-utils';
import { json } from '../json-plugin';

describe('rollipop:json', () => {
  it('should transform JSON file to ES module', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() =>
      JSON.stringify({ foo: 1, bar: 2, baz: 3 }, null, 2),
    );

    const driver = testPluginDriver(json());
    const result = await driver.load('test.json');

    expect(result).toMatchInlineSnapshot(`
      {
        "code": "const _0 = 1;
      const _1 = 2;
      const _2 = 3;
      export { _0 as "foo" };
      export { _1 as "bar" };
      export { _2 as "baz" };
      export default {"foo":_0,"bar":_1,"baz":_2};",
        "moduleType": "js",
      }
    `);
  });
});
