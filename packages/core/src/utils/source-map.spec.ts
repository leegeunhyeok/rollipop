import { describe, it, expect } from 'vitest';

import { replaceSourceMappingURL } from './source-map';

describe('source-map', () => {
  describe('replaceSourceMappingURL', () => {
    it('should replace source mapping URL', () => {
      const code = '//# sourceMappingURL=http://localhost:8081/index.js.map';
      const sourceMappingURL = 'http://localhost:8081/index.bundle.map?platform=ios';
      const result = replaceSourceMappingURL(code, sourceMappingURL);

      expect(result).toBe(
        '//# sourceMappingURL=http://localhost:8081/index.bundle.map?platform=ios',
      );
    });
  });
});
