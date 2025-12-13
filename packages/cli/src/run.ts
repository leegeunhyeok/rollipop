import { program } from '@commander-js/extra-typings';

import { version } from '../package.json' with { type: 'json' };
import { command as bundleCommand } from './commands/bundle';

export function run(argv: string[]) {
  const cli = program.name('rollipop').version(version);

  cli.addCommand(bundleCommand);

  cli.parse(argv);
}
