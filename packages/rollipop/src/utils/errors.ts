import stripAnsi from 'strip-ansi';

export function normalizeRolldownError(error: Error) {
  const normalizedError = new Error(stripAnsi(error.message));
  normalizedError.stack = error.stack;
  return normalizedError;
}
