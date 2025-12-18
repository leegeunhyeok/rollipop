export type HMRClientLogLevel =
  | 'trace'
  | 'info'
  | 'warn'
  | 'error'
  | 'log'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'debug';

export type HMRClientMessage =
  | {
      type: 'hmr:connected';
      bundleEntry: string;
      platform: string;
    }
  | {
      type: 'hmr:module-registered';
      modules: string[];
    }
  | {
      type: 'hmr:log';
      level: HMRClientLogLevel;
      data: any[];
    }
  | {
      type: 'hmr:invalidate';
      moduleId: string;
    };

export type HMRServerMessage =
  | {
      type: 'hmr:update-start';
    }
  | {
      type: 'hmr:update-done';
    }
  | {
      type: 'hmr:update';
      code: string;
    }
  | {
      type: 'hmr:reload';
    }
  | {
      type: 'hmr:error';
      payload: HMRServerError;
    };

export interface HMRServerError {
  type: string;
  message: string;
  errors: { description: string }[];
}
