// Utility Types
export type MaybePromise<T> = T | Promise<T>;
export type NullValue<T = void> = T | undefined | null | void;

export interface Reporter {
  update(event: ReportableEvent): void;
}

export type ReportableEvent =
  | {
      type: 'bundle_build_started';
    }
  | {
      type: 'bundle_build_done';
    }
  | {
      type: 'bundle_build_failed';
      error: Error;
    }
  | {
      type: 'transform';
      id: string;
      totalModules: number | undefined;
      transformedModules: number;
    }
  | {
      type: 'watch_change';
      id: string;
    }
  | MetroCompatibleClientLogEvent;

type MetroCompatibleClientLogEvent = {
  type: 'client_log';
  level:
    | 'trace'
    | 'info'
    | 'warn'
    | 'log'
    | 'group'
    | 'groupCollapsed'
    | 'groupEnd'
    | 'debug'
    /**
     * In react-native, ReportableEvent['level'] does not defined `error` type.
     * But, Flipper supports the `error` type.
     *
     * @see https://github.com/facebook/flipper/blob/v0.273.0/desktop/flipper-common/src/server-types.tsx#L74
     */
    | 'error';
  data: any[];
};
