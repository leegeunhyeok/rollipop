import stripAnsi from 'strip-ansi';

import type { ReportableEvent } from '../../types';
import type { SSEEvent } from './types';

export function toSSEEvent(id: string, event: ReportableEvent): SSEEvent | null {
  switch (event.type) {
    case 'bundle_build_started':
      return { type: 'bundle_build_started', id };

    case 'bundle_build_done':
      return {
        type: 'bundle_build_done',
        id,
        totalModules: event.totalModules,
        duration: event.duration,
      };

    case 'bundle_build_failed':
      return { type: 'bundle_build_failed', id, error: stripAnsi(event.error.message) };

    case 'watch_change':
      return { type: 'watch_change', id, file: event.id };

    case 'client_log':
      return { type: 'client_log', data: event.data };

    case 'transform':
      // Intentionally excluded from SSE — transform fires per module
      // and would consume excessive LLM tokens.
      return null;
  }
}
