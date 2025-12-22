import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'globalThis.__ROLLIPOP_VERSION__': JSON.stringify('0.0.0'),
  },
});
