import { Transformer } from '../../utils/type';

export type CacheOp = 'sync' | 'async';
export type OpValue<Op extends CacheOp, V> = Op extends 'sync' ? V : Promise<V>;

export interface CacheWithOp<Op extends CacheOp, V> {
  operation: Op;
  set(key: string, value: V): OpValue<Op, unknown>;
  get(key: string): OpValue<Op, V | undefined>;
  remove(key: string): OpValue<Op, unknown>;
  clear(): OpValue<Op, unknown>;
  getKeys(): OpValue<Op, string[]>;
  getAll(): OpValue<Op, Map<string, V>>;
}

export type SyncCache<V> = CacheWithOp<'sync', V>;
export type AsyncCache<V> = CacheWithOp<'async', V>;
export type Cache<V> = SyncCache<V> | AsyncCache<V>;

export class SyncPrefixCache<U, V> implements SyncCache<V> {
  private cache: SyncCache<U>;
  private prefix: string;
  private transformTo: Transformer<U, V>;
  private transformFrom: Transformer<V, U>;

  public readonly operation = 'sync';

  constructor(
    cache: SyncCache<U>, 
    prefix: string,
    transformTo: Transformer<U, V>,
    transformFrom: Transformer<V, U>
  ) {
    this.cache = cache;
    this.prefix = prefix;
    this.transformTo = transformTo;
    this.transformFrom = transformFrom;
  }

  private addPrefix(key: string): string {
    return `${this.prefix}${key}`;
  }

  private removePrefix(key: string): string {
    return key.substring(this.prefix.length);
  }

  set(key: string, value: V): unknown {
    return this.cache.set(this.addPrefix(key), this.transformFrom(value));
  }

  get(key: string): V | undefined {
    const value = this.cache.get(this.addPrefix(key));
    return value ? this.transformTo(value) : undefined;
  }

  remove(key: string): unknown {
    return this.cache.remove(this.addPrefix(key));
  }

  clear(): void {
    this.getInternalKeys().forEach((key) => this.cache.remove(key));
  }
  
  private getInternalKeys(): string[] {
    return this.cache.getKeys().filter((key) => key.startsWith(this.prefix));
  }

  getKeys(): string[] {
    return this.getInternalKeys().map((key) => this.removePrefix(key));
  }

  getAll(): Map<string, V> {
    const map = new Map<string, V>();
    this.getInternalKeys().forEach((key) => {
      const value = this.cache.get(key);
      if (value) {
        map.set(this.removePrefix(key), this.transformTo(value));        
      }
    });
    return map;
  }
}

export class AyncPrefixStore<U, V> implements AsyncCache<V> {
  private cache: AsyncCache<U>;
  private prefix: string;
  private transformTo: Transformer<U, V>;
  private transformFrom: Transformer<V, U>;

  public readonly operation = 'async';

  constructor(
    cache: AsyncCache<U>, 
    prefix: string,
    transformTo: Transformer<U, V>,
    transformFrom: Transformer<V, U>
  ) {
    this.cache = cache;
    this.prefix = prefix;
    this.transformTo = transformTo;
    this.transformFrom = transformFrom;
  }

  private addPrefix(key: string): string {
    return `${this.prefix}${key}`;
  }

  private removePrefix(key: string): string {
    return key.substring(this.prefix.length);
  }

  set(key: string, value: V): Promise<unknown> {
    return this.cache.set(this.addPrefix(key), this.transformFrom(value));
  }

  async get(key: string): Promise<V | undefined> {
    const value = await this.cache.get(this.addPrefix(key));
    return value ? this.transformTo(value) : undefined;
  }

  remove(key: string): Promise<unknown> {
    return this.cache.remove(this.addPrefix(key));
  }

  async clear(): Promise<void> {
    const keys = await this.getInternalKeys();
    await Promise.all(keys.map((key) => this.cache.remove(key)));
  }
  
  private async getInternalKeys(): Promise<string[]> {
    return this.cache.getKeys().then((keys) => keys.filter((key) => key.startsWith(this.prefix)));
  }

  async getKeys(): Promise<string[]> {
    return this.getInternalKeys().then((keys) => keys.map((key) => this.removePrefix(key)));
  }

  async getAll(): Promise<Map<string, V>> {
    const keys = await this.getInternalKeys();
    const values = await Promise.all(keys.map((key) => this.cache.get(key)));
    const map = new Map<string, V>();
    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        map.set(this.removePrefix(key), this.transformTo(value));
      }
    });
    return map;
  }
}
