export function getErrorStack(error: any) {
  if ('stack' in error) {
    const firstStack = (error as Error).stack
      ?.split('\n')
      .find((stack) => stack.trim().startsWith('at'));

    if (firstStack) {
      const matches = firstStack.match(/(\d+):(\d+)\)?\s*$/);

      if (matches) {
        const [, line, column] = matches;
        return { line: parseInt(line, 10), column: parseInt(column, 10) };
      }
    }
  }
  return null;
}
