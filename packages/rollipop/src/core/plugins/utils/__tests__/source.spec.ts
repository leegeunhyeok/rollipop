import { describe, expect, it } from 'vitest';

import { isTS, isJSX } from '../source';

describe('isTS', () => {
  it('should return true if the file is a TS file', () => {
    expect(isTS('index.ts')).toBe(true);
    expect(isTS('index.tsx')).toBe(true);
  });

  it('should return false if the file is not a TS file', () => {
    expect(isTS('index.js')).toBe(false);
    expect(isTS('index.jsx')).toBe(false);
  });
});

describe('isJSX', () => {
  it('should return true if the file is a JSX file', () => {
    expect(isJSX('index.jsx')).toBe(true);
    expect(isJSX('index.tsx')).toBe(true);
  });

  it('should return false if the file is not a JSX file', () => {
    expect(isJSX('index.js')).toBe(false);
  });
});
