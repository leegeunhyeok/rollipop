export function taskHandler() {
  let resolver: (value: void) => void;
  let rejector: (reason: unknown) => void;

  const task = new Promise<void>((resolve, reject) => {
    resolver = resolve;
    rejector = reject;
  });

  return {
    task,
    resolve: () => resolver?.(undefined),
    reject: (reason: unknown) => rejector?.(reason),
  };
}
