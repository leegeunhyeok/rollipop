export interface FileStorageData {
  build: {
    [buildHash: string]: {
      totalModules: number;
    };
  };
}

export interface Settings {
  devtools?: {
    autoOpen?: boolean;
  };
}
