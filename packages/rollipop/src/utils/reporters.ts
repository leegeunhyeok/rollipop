import chalk from 'chalk';

import { Logger } from '../common/logger';
import { ProgressBar, ProgressBarRenderManager } from '../common/progress-bar';
import { logger } from '../logger';
import type { ReportableEvent, Reporter } from '../types';

export function mergeReporters(reporters: Reporter[]): Reporter {
  return {
    update(event: ReportableEvent): void {
      reporters.forEach((reporter) => reporter.update(event));
    },
  };
}

export class ClientLogReporter implements Reporter {
  private logger = new Logger('app');

  update(event: ReportableEvent): void {
    if (event.type === 'client_log') {
      if (event.level === 'group' || event.level === 'groupCollapsed') {
        this.logger.info(...event.data);
        return;
      } else if (event.level === 'groupEnd') {
        return;
      }
      this.logger[event.level](...event.data);
    }
  }
}

enum ProgressFlags {
  NONE = 0b0000,
  BUILD_IN_PROGRESS = 0b0001,
  FILE_CHANGED = 0b0010,
}

export class ProgressBarStatusReporter implements Reporter {
  private renderManager = ProgressBarRenderManager.getInstance();
  private progressBar: ProgressBar;
  private flags = ProgressFlags.NONE;

  constructor(id: string, label: string, initialTotalModules: number) {
    this.progressBar = this.renderManager.register(id, {
      label,
      total: initialTotalModules,
    });
  }

  private renderProgress(id: string, totalModules: number | undefined, transformedModules: number) {
    if (totalModules != null) {
      this.progressBar.setTotal(totalModules);
    }
    this.progressBar.setCurrent(transformedModules).setModuleId(id);
    this.renderManager.render();
  }

  update(event: ReportableEvent): void {
    switch (event.type) {
      case 'bundle_build_started':
        this.flags |= ProgressFlags.BUILD_IN_PROGRESS;
        this.progressBar.start();
        this.renderManager.start();
        break;

      case 'bundle_build_failed':
        this.flags = ProgressFlags.NONE;
        this.progressBar.complete(0, true);
        this.renderManager.release();
        break;

      case 'bundle_build_done':
        this.flags = ProgressFlags.NONE;
        this.progressBar.setTotal(event.totalModules).complete(event.duration, false);
        this.renderManager.release();
        break;

      case 'transform':
        const { id, totalModules, transformedModules } = event;
        if (this.flags & ProgressFlags.FILE_CHANGED) {
          logger.debug('Transformed changed file', { id });
          return;
        }
        this.renderProgress(id, totalModules, transformedModules);
        break;

      case 'watch_change':
        this.flags |= ProgressFlags.FILE_CHANGED;
        break;
    }
  }
}

export class CompatStatusReporter implements Reporter {
  update(event: ReportableEvent): void {
    switch (event.type) {
      case 'bundle_build_started':
        logger.info('Build started...');
        break;

      case 'bundle_build_failed':
        logger.error(`Build failed`);
        break;

      case 'bundle_build_done':
        const { duration, totalModules } = event;
        const time = chalk.blue(`${duration.toFixed(2)}ms`);
        const modules = chalk.blue(`(${totalModules} modules)`);
        logger.info(`Build completed in ${time} ${modules}`);
        break;
    }
  }
}
