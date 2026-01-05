import fs from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { testPluginDriver } from '../../../testing/plugin-testing-utils';
import { json } from '../json-plugin';

describe('rollipop:json', () => {
  it('should transform JSON file to TS module', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() =>
      JSON.stringify({ foo: 1, bar: 2, baz: 3 }, null, 2),
    );

    const driver = testPluginDriver(json());
    const result = await driver.load('test.json');

    expect(result).toMatchInlineSnapshot(`
      {
        "code": "export = {
        "foo": 1,
        "bar": 2,
        "baz": 3
      };",
        "meta": {
          Symbol(transform-flags): 128,
        },
        "moduleType": "ts",
      }
    `);
  });
});
