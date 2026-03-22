declare module 'flow-remove-types' {
  interface FlowRemoveTypesOptions {
    all?: boolean;
    removeEmptyImports?: boolean;
  }

  function flowRemoveTypes(
    code: string,
    options?: FlowRemoveTypesOptions,
  ): {
    toString: () => string;
    generateMap: () => any;
  };

  export default flowRemoveTypes;
}
