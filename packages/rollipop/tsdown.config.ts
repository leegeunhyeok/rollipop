import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: 'src/index.ts',
    outDir: 'dist',
    format: ['esm', 'cjs'],
    platform: 'node',
    fixedExtension: false,
    dts: true,
  },
  {
    entry: 'src/runtime.ts',
    outDir: 'dist',
    format: ['esm', 'cjs'],
    platform: 'neutral',
    fixedExtension: false,
    dts: true,
  },
]);
