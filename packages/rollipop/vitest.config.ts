import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'globalThis.__ROLLIPOP_VERSION__': JSON.stringify('0.0.0'),
  },
  test: {
    globalSetup: ['./e2e/global-setup.ts'],
    coverage: {
      include: ['src/**'],
      exclude: [
        '**/dist/**',
        '**/e2e/**',
        '**/testing/**',
        '**/__tests__/**',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
});
