declare module 'xcode' {
  function project(path: string): {
    parseSync(): {
      filepath: string;
      hash: {
        project: {
          objects: Record<string, any>;
        };
      };
      writeSync(): string;
    };
  };

  export default { project };
}
