import pc from 'picocolors';

import { setupPackage, setupReactNativeConfig } from './init';

const logger = {
  success(message: string) {
    console.log(pc.green('✓'), message);
  },
  info(message: string) {
    console.log(pc.cyan('ℹ'), message);
  },
  warn(message: string) {
    console.log(pc.yellow('⚠'), message);
  },
  error(message: string, reason: unknown) {
    console.error(
      pc.red('✗'),
      `${message}: ${reason instanceof Error ? reason.message : String(reason)}`,
    );
  },
};

console.log(
  `\n${pc.bold(pc.cyan('rollipop'))} ${pc.dim('— Modern build toolkit for React Native')}\n`,
);

const cwd = process.cwd();

let failed = false;
let hasWarning = false;

try {
  const result = setupReactNativeConfig(cwd);
  switch (result) {
    case 'created':
      logger.success(`Created ${pc.bold('react-native.config.js')}`);
      break;
    case 'updated':
      logger.success(`Updated ${pc.bold('react-native.config.js')}`);
      break;
    case 'already-configured':
      logger.info(`${pc.bold('react-native.config.js')} already configured`);
      break;
    case 'manual-required':
      hasWarning = true;
      logger.warn(`Could not auto-configure: ${pc.bold('module.exports')} is not a plain object`);
      console.log(
        `  ${pc.dim('Add the following to your')} ${pc.bold('react-native.config.js')}${pc.dim(':')}\n` +
          `  ${pc.green("commands: require('rollipop/commands'")})`,
      );
      break;
  }
} catch (error) {
  logger.error('React Native CLI setup failed', error);
  failed ||= true;
}

if (hasWarning || failed) console.log();

try {
  setupPackage(cwd);
  logger.success(`Added ${pc.bold('rollipop')} to ${pc.bold('devDependencies')}`);
} catch (error) {
  logger.error('Package setup failed', error);
  failed ||= true;
}

if (failed) {
  console.log(
    '\n' +
      pc.red('Setup failed.') +
      ` Follow the manual guide: ${pc.underline(pc.cyan('https://rollipop.dev/docs/get-started/quick-start'))}`,
  );
  process.exit(1);
}

logger.success(pc.bold('Setup completed!'));
console.log();
console.log(`  ${pc.dim('Install dependencies manually to finish setup.')}`);
console.log(
  `  ${pc.dim('See')} ${pc.underline(pc.cyan('https://rollipop.dev'))} ${pc.dim('for configuration details.')}`,
);
