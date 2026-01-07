// This type declarations are for React Native 0.83.x.
// If you are using other versions of React Native, please type declare yourself for compatibility.

declare module '*/LogBox' {
  const LogBox: { clearAllLogs: () => void };

  export default LogBox;
}

declare module '*/NativeRedBox' {
  const NativeRedBox: { dismiss?: () => void };

  export default NativeRedBox;
}

declare module '*/DevLoadingView' {
  const DevLoadingView: {
    showMessage: (message: string, type: string, options?: { dismissButton?: boolean }) => void;
    hide: () => void;
  };

  export default DevLoadingView;
}

declare module '*/Platform' {
  const Platform: { OS: string };

  export default Platform;
}

declare module 'pretty-format' {
  const prettyFormat: {
    format: (value: any, options?: any) => string;
    plugins: {
      ReactElement: any;
    };
  };

  export default prettyFormat;
}
