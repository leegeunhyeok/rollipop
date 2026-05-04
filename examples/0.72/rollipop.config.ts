import { defineConfig } from 'rollipop';

export default defineConfig({
  runtimeTarget: 'hermes',
  devMode: {
    hmr: false,
  },
  experimental: {
    nativeTransformPipeline: true,
    worklets: {},
  },
});
