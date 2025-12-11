declare module 'hermes-parser' {
  type Ast = any;

  interface ParseOptions {
    flow?: 'all' | 'detect';
    babel?: boolean;
  }

  export function parse(code: string, options?: ParseOptions): Ast;
}
