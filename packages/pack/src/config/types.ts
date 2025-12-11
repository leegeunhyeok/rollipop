import type * as rolldown from 'rolldown';

export interface Config {
  root?: string;
  entry?: string;
  serializer?: SerializerConfig;
  INTERNAL__rolldown?: RolldownConfig;
}

export interface SerializerConfig {
  prelude?: string[];
  polyfills?: string[];
}

export interface RolldownConfig {
  input?: rolldown.InputOption;
  output?: rolldown.OutputOptions;
}
