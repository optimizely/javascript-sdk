export interface SyncCache<V = any> {
  operation: 'sync';
  set(key: string, value: V): void;
  get(key: string): V;
  remove(key: string): void;
  clear(): void;
  getKeys(): string[];
  getAll(): Map<string, V>;
  size(): number;
};

export interface AsyncCache<V = any> {
  operation: 'async';
  set(key: string, value: V): Promise<void>;
  get(key: string): Promise<V>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getKeys(): Promise<string[]>;
  getAll():Promise<Map<string, V>>;
  size(): number;
};

export type Cache<V = any> = SyncCache<V> | AsyncCache<V>;
