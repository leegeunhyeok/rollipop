import { defineConfig, type PluginOption } from 'rollipop';

import { config, hot, worklet } from './plugins';

function myPlugin(): PluginOption {
  return [hot(), worklet(), config()];
}

export default defineConfig({
  entry: 'index.js',
  plugins: [myPlugin()],
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
