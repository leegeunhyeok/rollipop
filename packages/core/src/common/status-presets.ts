import { chalk } from '@rollipop/common';

import { StatusPluginOptions } from '../core/plugins';
import { BundlerContext } from '../core/types';
import { logger } from '../logger';
import { getBuildTotalModules, setBuildTotalModules } from '../utils/storage';
import { ProgressBarRenderer } from './progress-bar';

function progressBar(context: BundlerContext, label: string): StatusPluginOptions {
  let totalModules = getBuildTotalModules(context.storage, context.id);
  const progressBarRenderer = ProgressBarRenderer.getInstance();
  const progressBar = progressBarRenderer.register(context.id, {
    label,
    total: totalModules,
  });

  return {
    onStart() {
      progressBar.start();
      progressBarRenderer.start();
    },
    onEnd({ transformedModules, ...state }) {
      progressBar.setTotal(transformedModules).update(state).end();
      progressBarRenderer.release();
      totalModules = transformedModules;
      setBuildTotalModules(context.storage, context.id, totalModules);
    },
    onTransform({ id, transformedModules }) {
      if (totalModules < transformedModules) {
        totalModules = transformedModules;
        progressBar.setTotal(totalModules);
      }
      progressBar.setCurrent(transformedModules).update({ id });
      progressBarRenderer.render();
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
