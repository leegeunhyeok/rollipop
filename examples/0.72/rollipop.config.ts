import { defineConfig } from 'rollipop';


const noopHmrClient = `
module.exports = { default: {
  setup() {}, enable() {}, disable() {},
  registerBundle() {}, log() {},
} };
`;

export default defineConfig({
  entry: 'index.js',
  runtimeTarget: 'hermes',
  devMode: {
    hmr: { clientImplement: noopHmrClient },
  },
});
