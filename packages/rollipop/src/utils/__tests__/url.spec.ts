import { describe, expect, it } from 'vitest';

import { parseUrl } from '../url';

describe('url', () => {
  describe('parseUrl', () => {
    it('should parse a full URL', () => {
      const url = 'https://example.com/path?foo=1&bar=2&baz=3';
      const result = parseUrl(url);

      expect(result).toEqual({
        pathname: '/path',
        query: { foo: '1', bar: '2', baz: '3' },
      });
    });

    it('should parse a relative URL', () => {
      const url = '/path?foo=1&bar=2&baz=3';
      const result = parseUrl(url);

      expect(result).toEqual({
        pathname: '/path',
        query: { foo: '1', bar: '2', baz: '3' },
      });
    });
  });
});
