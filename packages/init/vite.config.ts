import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: 'src/index.ts',
    outDir: 'dist',
    format: 'esm',
    platform: 'node',
    fixedExtension: false,
    dts: false,
    checks: {
      pluginTimings: false,
    },
  },
});
