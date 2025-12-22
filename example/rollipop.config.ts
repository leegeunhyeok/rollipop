import { defineConfig } from 'rollipop';

import { config, worklet } from './plugins';

export default defineConfig({
  entry: 'index.js',
  plugins: [worklet(), config()],
});
