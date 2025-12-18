const { Bundler, loadConfig } = require('@rollipop/core');

async function main() {
  const config = await loadConfig(process.cwd());
  const bundler = new Bundler(config);

  await bundler.build({
    dev: true,
    cache: false,
    platform: 'ios',
    outfile: 'dist/bundle.js',
  });
}

main().catch((error) => {
  console.error('Build failed', error);
});
