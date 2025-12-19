import { chalk } from '@rollipop/common';

import { StatusPluginOptions } from '../core/plugins';
import { BundlerContext } from '../core/types';
import { logger } from '../logger';
import { getBuildTotalModules, setBuildTotalModules } from '../utils/storage';
import { ProgressBarRenderer } from './progress-bar';

enum ProgressFlags {
  None = 0b0000,
  BuildInProgress = 0b0001,
  WatchChange = 0b0010,
}

function progressBar(context: BundlerContext, label: string): StatusPluginOptions {
  let flags = ProgressFlags.None;
  let totalModules = getBuildTotalModules(context.storage, context.id);
  let unknownTotalModules = totalModules === 0;

  const progressBarRenderer = ProgressBarRenderer.getInstance();
  const progressBar = progressBarRenderer.register(context.id, {
    label,
    total: totalModules,
  });

  const renderProgress = (id: string, transformedModules: number) => {
    if (!unknownTotalModules && totalModules < transformedModules) {
      totalModules = transformedModules;
      progressBar.setTotal(totalModules);
    }
    progressBar.setCurrent(transformedModules).update({ id });
    progressBarRenderer.render();
  };

  return {
    onStart() {
      flags = ProgressFlags.BuildInProgress;
      progressBar.start();
      progressBarRenderer.start();
    },
    onEnd({ transformedModules, ...state }) {
      flags = ProgressFlags.None;
      totalModules = transformedModules;
      unknownTotalModules = false;

      progressBar.setTotal(transformedModules).update(state).end();
      progressBarRenderer.release();
      setBuildTotalModules(context.storage, context.id, totalModules);
    },
    onTransform({ id, transformedModules }) {
      switch (true) {
        case Boolean(flags & ProgressFlags.BuildInProgress):
          renderProgress(id, transformedModules);
          break;

        case Boolean(flags & ProgressFlags.WatchChange):
          logger.debug('Transformed changed file', { id });
          break;
      }
    },
    onWatchChange() {
      flags = flags | ProgressFlags.WatchChange;
    },
  };
}

function compat(): StatusPluginOptions {
  return {
    onStart() {
      logger.info('Build started...');
    },
    onEnd({ transformedModules, duration }) {
      const time = chalk.blue(`${duration.toFixed(2)}ms`);
      const modules = chalk.blue(`(${transformedModules} modules)`);
      logger.info(`Build finished in ${time} ${modules}`);
    },
  };
}

export const statusPresets = { progressBar, compat };
