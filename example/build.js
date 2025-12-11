const { Bundler, loadConfig } = require('@rollipop/pack');

const config = loadConfig(process.cwd());
const bundler = new Bundler(config);

bundler
  .build()
  .then(() => {
    console.log('Build completed');
  })
  .catch((error) => {
    console.error('Build failed', error);
  });
