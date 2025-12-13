import { Command } from '@commander-js/extra-typings';
import { Bundler, loadConfig } from '@rollipop/pack';

import { UNSUPPORTED_OPTION_DESCRIPTION } from '../../constants';
import { parseBoolean } from '../../utils';

export const command = new Command('build')
  .description('Build the bundle for the provided JavaScript entry file.')
  .option('--config <string>', 'Path to the CLI configuration file')
  .requiredOption(
    '--entry-file <path>',
    'Path to the root JS file, either absolute or relative to JS root',
  )
  .requiredOption(
    '--bundle-output <string>',
    'File name where to store the resulting bundle, ex. /tmp/groups.bundle',
  )
  .option('--platform <string>', 'Either "ios" or "android"', 'ios')
  .option(
    '--dev [boolean]',
    'If false, warnings are disabled and the bundle is minified',
    parseBoolean,
    true,
  )
  .option(
    '--minify [boolean]',
    'Allows overriding whether bundle is minified. This defaults to false if dev is true, and true if dev is false. Disabling minification can be useful for speeding up production builds for testing purposes.',
    parseBoolean,
    false,
  )
  .option(
    '--sourcemap-output <string>',
    'File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map',
  )
  .option(
    '--sourcemap-sources-root <string>',
    "Path to make sourcemap's sources entries relative to, ex. /root/dir",
  )
  .option('--sourcemap-use-absolute-path', 'Report SourceMapURL using its full path', false)
  .option('--assets-dest <string>', 'Directory name where to store assets referenced in the bundle')
  .option('--cache [boolean]', 'If false, the bundler will not cache anything', parseBoolean, true)
  .option('--reset-cache', 'Removes cached files')
  // Unsupported options
  .option('--transformer <string>', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--bundle-encoding <string>', UNSUPPORTED_OPTION_DESCRIPTION, 'utf8')
  .option(
    '--max-workers <number>',
    UNSUPPORTED_OPTION_DESCRIPTION,
    (value) => parseInt(value, 10),
    0,
  )
  .option('--unstable-transform-profile <string>', UNSUPPORTED_OPTION_DESCRIPTION, 'default')
  .option('--asset-catalog-dest [string]', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--read-global-cache', UNSUPPORTED_OPTION_DESCRIPTION)
  .option('--resolver-option <string...>', UNSUPPORTED_OPTION_DESCRIPTION)
  .action(async (options) => {
    const config = await loadConfig({
      cwd: process.cwd(),
      configFile: options.config,
    });
    const bundler = new Bundler(config);

    if (options.resetCache) {
      bundler.resetCache();
    }

    if (options.entryFile) {
      config.entry = options.entryFile;
    }

    await bundler.build({
      platform: options.platform,
      dev: options.dev,
      minify: options.minify,
      cache: options.cache,
      outfile: options.bundleOutput,
    });
  });
