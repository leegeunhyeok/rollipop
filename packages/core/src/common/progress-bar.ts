import { chalk } from '@rollipop/common';
import { range, throttle, type ThrottledFunction } from 'es-toolkit';

import { ellipsisLeft, StreamManager } from '../utils/terminal';

const BAR_LENGTH = 25;
const BLOCK_CHAR = '█';

export interface ProgressBarOptions {
  label: string;
  total: number;
}

export type ProgressBarState = ProgressBarRunningState | ProgressBarDoneState;

export interface ProgressBarRunningState {
  id: string;
}

export interface ProgressBarDoneState {
  hasErrors: boolean;
  duration: number;
}

export class ProgressBar {
  private columns = (process.stderr.columns || 80) - 2;
  private state: ProgressBarState | null = null;
  private current = 0;
  private total = 0;
  private label: string;

  stale = false;
  done = false;

  constructor(options: ProgressBarOptions) {
    this.total = options.total;
    this.label = options.label;
  }

  setCurrent(current: number) {
    this.current = current;
    this.stale = true;
    return this;
  }

  setTotal(total: number) {
    this.total = total;
    this.stale = true;
    return this;
  }

  start() {
    this.stale = true;
    this.done = false;
  }

  end() {
    this.done = true;
  }

  update(state: ProgressBarState) {
    this.state = state;
    this.stale = true;
    return this;
  }

  render() {
    const { state, label, current, total } = this;

    const unknownTotal = total === 0;
    const progress = unknownTotal ? 0 : (current / total) * 100;
    let line1 = '';
    let line2 = '';

    if (state && 'duration' in state) {
      const icon = state.hasErrors ? chalk.red('✘') : chalk.green('✔');
      const durationInSeconds = (state.duration / 1000).toFixed(2);

      line1 = `${icon} Build completed ${chalk.gray(label)}`;
      line2 = chalk.grey(`  Built in ${durationInSeconds}s (${current}/${total} modules)`);
    } else {
      const width = unknownTotal ? 0 : progress * (BAR_LENGTH / 100);
      const bg = chalk.white(BLOCK_CHAR);
      const fg = chalk.cyan(BLOCK_CHAR);
      const bar = range(BAR_LENGTH)
        .map((n) => (n < width ? fg : bg))
        .join('');

      const progressLabel = unknownTotal
        ? chalk.gray('(calculating...)')
        : `(${progress.toFixed(2)}%)`;
      const moduleCountLabel = unknownTotal ? `${current} modules` : `${current}/${total} modules`;

      line1 = [
        chalk.cyan('●'),
        bar,
        progressLabel,
        chalk.gray(moduleCountLabel),
        chalk.gray(label),
      ].join(' ');
      line2 = state?.id ? '  ' + chalk.grey(ellipsisLeft(state?.id, this.columns)) : '';
    }

    this.stale = false;

    return `${line1}\n${line2}`;
  }
}

export class ProgressBarRenderer {
  private static instance: ProgressBarRenderer | null = null;
  private streamManager = new StreamManager();
  private progressBars: Map<string, ProgressBar> = new Map();
  private throttledRender: ThrottledFunction<() => void>;

  static getInstance() {
    if (!ProgressBarRenderer.instance) {
      ProgressBarRenderer.instance = new ProgressBarRenderer();
    }
    return ProgressBarRenderer.instance;
  }

  private constructor() {
    this.throttledRender = throttle(this._render.bind(this), 50);
  }

  private _render() {
    const renderedLines = Array.from(
      this.progressBars
        .values()
        .filter((progressBar) => progressBar.stale)
        .map((progressBar) => progressBar.render()),
    );

    if (renderedLines.length > 0) {
      this.streamManager.render(renderedLines.join('\n\n'));
    }
  }

  register(key: string, options: ProgressBarOptions) {
    const progressBar = this.progressBars.get(key);

    if (progressBar == null) {
      const newProgressBar = new ProgressBar(options);
      this.progressBars.set(key, newProgressBar);
      return newProgressBar;
    }

    return progressBar;
  }

  start() {
    console.log();
    this.streamManager.listen();
    this._render();
  }

  render() {
    this.throttledRender();
  }

  release() {
    if (this.progressBars.values().every((progressBar) => progressBar.done)) {
      this._render();
      this.streamManager.done();
      console.log();
    }
  }

  clear() {
    this.streamManager.clear();
  }
}
