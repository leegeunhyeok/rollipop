import { describe, expect, it } from 'vite-plus/test';

import type { ReportableEvent } from '../../../types';
import { toSSEEvent } from '../reporter';

describe('toSSEEvent', () => {
  const bundlerId = 'ios-true';

  it('should convert bundle_build_started with id', () => {
    const event: ReportableEvent = { type: 'bundle_build_started' };

    expect(toSSEEvent(bundlerId, event)).toEqual({
      type: 'bundle_build_started',
      id: 'ios-true',
    });
  });

  it('should convert bundle_build_done with id', () => {
    const event: ReportableEvent = { type: 'bundle_build_done', totalModules: 100, duration: 500 };

    expect(toSSEEvent(bundlerId, event)).toEqual({
      type: 'bundle_build_done',
      id: 'ios-true',
      totalModules: 100,
      duration: 500,
    });
  });

  it('should serialize Error to string for bundle_build_failed', () => {
    const event: ReportableEvent = {
      type: 'bundle_build_failed',
      error: new Error('SyntaxError: Unexpected token'),
    };

    expect(toSSEEvent(bundlerId, event)).toEqual({
      type: 'bundle_build_failed',
      id: 'ios-true',
      error: 'SyntaxError: Unexpected token',
    });
  });

  it('should return null for transform events', () => {
    const event: ReportableEvent = {
      type: 'transform',
      id: 'src/App.tsx',
      totalModules: 100,
      transformedModules: 50,
    };

    expect(toSSEEvent(bundlerId, event)).toBeNull();
  });

  it('should convert watch_change with id and rename fields', () => {
    const event: ReportableEvent = { type: 'watch_change', id: 'src/App.tsx' };

    expect(toSSEEvent(bundlerId, event)).toEqual({
      type: 'watch_change',
      id: 'ios-true',
      file: 'src/App.tsx',
    });
  });

  it('should convert client_log without id', () => {
    const event: ReportableEvent = {
      type: 'client_log',
      level: 'error',
      data: ['Something went wrong'],
    };

    expect(toSSEEvent(bundlerId, event)).toEqual({
      type: 'client_log',
      data: ['Something went wrong'],
    });
  });
});
