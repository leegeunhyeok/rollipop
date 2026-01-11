import { createReactNativeCliCommand } from './node/cli-utils';
import { command as bundleCommand } from './node/commands/bundle';
import { command as startCommand } from './node/commands/start';

const commands = [
  createReactNativeCliCommand(startCommand),
  createReactNativeCliCommand(bundleCommand),
] as const;

export default commands;
