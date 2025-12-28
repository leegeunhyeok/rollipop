import fs from 'node:fs';
import path from 'node:path';

import glob from 'fast-glob';
import pc from 'picocolors';
import whichPm from 'which-pm';
import xcode from 'xcode';

const TARGET_BUILD_PHASE_NAME = 'Bundle React Native code and images';
const EXPORT_CLI_PATH = 'export CLI_PATH="$PROJECT_DIR/node_modules/rollipop/bin/index.js"';

const logger = {
  success(message: string) {
    console.log(pc.green('✓'), message);
  },
  error(message: string, reason: unknown) {
    console.error(
      pc.red('✗'),
      `${message}: ${reason instanceof Error ? reason.message : String(reason)}`,
    );
  },
};

async function findAppBuildGradle(cwd: string) {
  const files = await glob('**/android/app/build.gradle', {
    cwd,
  });

  if (files.length === 0) {
    throw new Error('No Android build.gradle found');
  }

  if (files.length > 1) {
    throw new Error('Multiple Android build.gradle found:\n' + files.join('\n'));
  }

  return path.join(cwd, files[0]);
}

async function updateGradleCLIPath(appBuildGradlePath: string) {
  const appBuildGradle = fs.readFileSync(appBuildGradlePath, 'utf8');
  const appBuildGradleLines = appBuildGradle.split('\n');

  if (appBuildGradleLines.find((line) => line.trim().startsWith('cliFile ='))) {
    throw new Error(`'cliFile' already configured`);
  }

  const index = appBuildGradleLines.findIndex((line) => line.trim().startsWith('react {'));

  if (index === -1) {
    throw new Error(`'react' configuration block not found in build.gradle`);
  }

  fs.writeFileSync(
    appBuildGradlePath,
    [
      ...appBuildGradleLines.slice(0, index + 1),
      '  cliFile = file("../../node_modules/rollipop/bin/index.js")',
      ...appBuildGradleLines.slice(index + 1),
    ].join('\n'),
  );
}

async function findXCodeProject(cwd: string) {
  const basePath = path.join(cwd, 'ios');
  const files = await glob('**/*.xcodeproj/project.pbxproj', {
    cwd: basePath,
    ignore: ['Pods/**'],
  });

  if (files.length === 0) {
    throw new Error('No Xcode project found');
  }

  if (files.length > 1) {
    throw new Error('Multiple Xcode projects found:\n' + files.join('\n'));
  }

  return path.join(basePath, files[0]);
}

function updateXCodeCLIPath(xcodeProjectPath: string) {
  const project = xcode.project(xcodeProjectPath).parseSync();
  const buildPhases = Object.entries(
    project.hash?.project?.objects?.PBXShellScriptBuildPhase ?? {},
  );

  const buildPhase: [string, any] | undefined = buildPhases.find(([_key, phase]: [string, any]) =>
    phase.name.includes(TARGET_BUILD_PHASE_NAME),
  );

  if (buildPhase == null) {
    throw new Error(`'${TARGET_BUILD_PHASE_NAME}' build phase not found`);
  }

  const originShellScript = JSON.parse(buildPhase[1].shellScript) as string;

  if (originShellScript.includes('CLI_PATH=')) {
    throw new Error(`'CLI_PATH' environment variable already configured`);
  }

  const originShellScriptLines = originShellScript.split('\n');
  const index = originShellScriptLines.findIndex((line) => line.trim().startsWith('set -'));

  let newShellScript = '';
  if (index === -1) {
    newShellScript = `${EXPORT_CLI_PATH}\n${originShellScript}`;
  } else {
    newShellScript = [
      ...originShellScriptLines.slice(0, index + 1),
      EXPORT_CLI_PATH,
      ...originShellScriptLines.slice(index + 1),
    ].join('\n');
  }

  buildPhase[1].shellScript = JSON.stringify(newShellScript);

  fs.writeFileSync(project.filepath, project.writeSync());
}

async function setupAndroid(cwd: string) {
  const appBuildGradlePath = await findAppBuildGradle(cwd);
  await updateGradleCLIPath(appBuildGradlePath);
}

async function setupIos(cwd: string) {
  const xcodeProjectPath = await findXCodeProject(cwd);
  updateXCodeCLIPath(xcodeProjectPath);
}

function setupPackage(cwd: string) {
  const packageJsonPath = path.join(cwd, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    rollipop: 'latest',
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

const cwd = process.cwd();

let failed = false;

try {
  await setupAndroid(cwd);
  logger.success('Android setup completed');
} catch (error) {
  logger.error('Android setup failed', error);
  failed ||= true;
}

try {
  await setupIos(cwd);
  logger.success('iOS setup completed');
} catch (error) {
  logger.error('iOS setup failed', error);
  failed ||= true;
}

let packageManager: string | null = null;
try {
  packageManager = (await whichPm(cwd))?.name ?? null;
  setupPackage(cwd);
  logger.success('Package setup completed');
} catch (error) {
  logger.error('Package setup failed', error);
  failed ||= true;
}

if (failed) {
  console.warn(
    '\n' +
      'Failed to setup project automatically' +
      '\n\n' +
      `Please follow the manual setup guide: ${pc.underline('https://rollipop.dev/docs/get-started/quick-start')}`,
  );
  process.exit(1);
} else {
  logger.success('Project setup completed');

  if (packageManager == null) {
    console.log('No package manager found, please install dependencies manually');
  } else {
    const command = pc.bold(`${packageManager} install`);
    console.log(`Run ${command} to install dependencies`);
  }
}
