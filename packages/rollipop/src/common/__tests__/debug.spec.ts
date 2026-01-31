import { describe, expect, it } from 'vitest';

import { parseDebugKeys } from '../debug';

describe('debug', () => {
  describe('parseDebugKeys', () => {
    it('should parse debug keys (truthy values)', () => {
      process.env.DEBUG_FOO = 'yes';
      process.env.DEBUG_BAR = 'on';
      process.env.DEBUG_BAZ = 'true';
      process.env.DEBUG_QUX = 'enabled';
      process.env.DEBUG_QUUX = '1';

      expect(parseDebugKeys()).toEqual({
        foo: true,
        bar: true,
        baz: true,
        qux: true,
        quux: true,
      });
    });

    it('should parse debug keys (falsy values)', () => {
      process.env.DEBUG_FOO = 'no';
      process.env.DEBUG_BAR = 'off';
      process.env.DEBUG_BAZ = 'false';
      process.env.DEBUG_QUX = 'disabled';
      process.env.DEBUG_QUUX = '0';

      expect(parseDebugKeys()).toEqual({
        foo: false,
        bar: false,
        baz: false,
        qux: false,
        quux: false,
      });
    });
  });
});
