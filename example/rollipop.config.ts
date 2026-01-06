import { defineConfig, Plugin } from 'rollipop';

import { config, hot, worklet } from './plugins';

function myPlugin(): Plugin[] {
  return [hot(), worklet(), config()];
}

export default defineConfig({
  entry: 'index.js',
  plugins: [myPlugin()],
});
