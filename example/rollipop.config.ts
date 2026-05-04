import { analyze } from '@rollipop/plugin-analyze';
import { rozenite } from '@rollipop/plugin-rozenite';
import { defineConfig, type PluginOption } from 'rollipop';

import { config, hot } from './plugins';

function myPlugin(): PluginOption {
  return [hot(), config()];
}

export default defineConfig({
  entry: 'index.js',
  plugins: [
    myPlugin(),
    rozenite({ enabled: process.env.WITH_ROZENITE === 'true', logLevel: 'debug' }),
    analyze(),
  ],
  experimental: {
    // Opt into the rust-side native transform pipeline. Required for the
    // `experimental.worklets` option below.
    nativeTransformPipeline: true,
    // Enable react-native-worklets transformation (native pipeline only).
    worklets: {},
  },
  terminal: {
    extraCommands: [
      {
        key: 'a',
        description: 'My custom command 1',
        handler: () => {
          console.log('My custom command 1');
        },
      },
      {
        key: 'a',
        shift: true,
        description: 'My custom command 2',
        handler: () => {
          console.log('My custom command 2');
        },
      },
    ],
  },
});
