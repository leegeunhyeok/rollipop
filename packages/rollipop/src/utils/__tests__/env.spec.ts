import { describe, it, expect } from 'vite-plus/test';

import { defineEnvFromObject } from '../env';

describe('defineEnvFromObject', () => {
  it('should define environment variables', () => {
    const env = defineEnvFromObject({
      ROLLIPOP_API_URL: 'https://api.example.com',
      ROLLIPOP_API_BASE: 'https://api.example.com',
      ROLLIPOP_API_KEY: '1234567890',
    });

    expect(env).toEqual({
      'import.meta.env.ROLLIPOP_API_URL': '"https://api.example.com"',
      'import.meta.env.ROLLIPOP_API_BASE': '"https://api.example.com"',
      'import.meta.env.ROLLIPOP_API_KEY': '"1234567890"',
    });
  });
});
