import stripAnsi from 'strip-ansi';

export function stripAnsiLogger(log: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    log(...args.map((value) => (typeof value === 'string' ? stripAnsi(value) : value)));
  };
}
