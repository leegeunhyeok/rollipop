import type { StackFrameInput, StackFrameOutput, CodeFrame } from '../symbolicate';

export type SSEEvent =
  // Build lifecycle events (from reporter pipeline, always have bundler id)
  | { type: 'bundle_build_started'; id: string }
  | { type: 'bundle_build_done'; id: string; totalModules: number; duration: number }
  | { type: 'bundle_build_failed'; id: string; error: string }
  | { type: 'watch_change'; id: string; file: string }
  // Client log events (from HMR client)
  | { type: 'client_log'; data: unknown[] }
  // HMR events
  | { type: 'hmr_update'; id: string; platform: string; updatedModules: number }
  | { type: 'hmr_reload'; id: string; platform: string }
  // Symbolicate events
  | { type: 'symbolicate_request'; stack: StackFrameInput[] }
  | { type: 'symbolicate_result'; stack: StackFrameOutput[]; codeFrame: CodeFrame | null }
  // Device lifecycle events
  | { type: 'device_connected'; clientId: number }
  | { type: 'device_disconnected'; clientId: number }
  // Server lifecycle events
  | { type: 'server_ready'; host: string; port: number }
  // Control API events
  | { type: 'cache_reset' };
