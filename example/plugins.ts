import { defineConfig } from 'rollipop';

export default defineConfig({
  entry: 'src/index.ts',
  plugins: [
    {
      name: 'noop-serializer',
      config(config) {
        if (config.serializer) {
          config.serializer.prelude = [];
          config.serializer.polyfills = [];
        }
      },
    },
    {
      name: 'resolver-priority',
      config(config) {
        if (config.resolver == null) {
          return;
        }

        if (process.env.ESM_ONLY === '1') {
          config.resolver.conditionNames = ['import'];
        }

        if (process.env.CJS_ONLY === '1') {
          config.resolver.conditionNames = ['require'];
        }
      },
    },
    {
      name: 'noop-asset',
      load: {
        filter: {
          id: /\.png$/,
        },
      },
      handler(id) {
        return `export default 'asset:${id}'`;
      },
    },
  ],
});
