export interface Cache<Key, Input, Output = Input> {
  get(key: Key): Output | null | undefined;
  set(key: Key, value: Input): void;
  clear(): void;
}
