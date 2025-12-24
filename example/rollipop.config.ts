import { defineConfig } from 'rollipop';

import { config, hot, worklet } from './plugins';

export default defineConfig({
  entry: 'index.js',
  plugins: [worklet(), config(), hot()],
});
