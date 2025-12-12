const { Bundler, loadConfig } = require('@rollipop/pack');

async function main() {
  const config = await loadConfig(process.cwd());
  const bundler = new Bundler(config);

  await bundler.build({
    dev: true,
    cache: true,
    platform: 'ios',
    outDir: 'dist',
  });
}

main().catch((error) => {
  console.error('Build failed', error);
});
