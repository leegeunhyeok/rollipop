import { Logger } from '@rollipop/common';
import type { ReportableEvent, Reporter } from 'rollipop';

export interface TerminalReporterOptions {
  clientLogs: boolean;
}

export class TerminalReporter implements Reporter {
  private appLogger = new Logger('app');

  constructor(private readonly options: TerminalReporterOptions) {}

  update(event: ReportableEvent): void {
    if (event.type === 'client_log' && this.options.clientLogs) {
      if (event.level === 'group' || event.level === 'groupCollapsed') {
        this.appLogger.info(...event.data);
        return;
      } else if (event.level === 'groupEnd') {
        return;
      }
      this.appLogger[event.level](...event.data);
    }
  }
}
