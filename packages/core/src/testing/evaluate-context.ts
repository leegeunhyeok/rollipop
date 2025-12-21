import { type Context, createContext, Script } from 'node:vm';

export function evaluateContext(vmContext?: Context) {
  const context = createContext({
    assert: (value: unknown) => {
      if (!value) {
        throw new Error('Assertion failed');
      }
    },
    ...vmContext,
  });

  return {
    evaluate: (code: string) => {
      return new Script(code).runInContext(context);
    },
  };
}
