import { SyncCache, AsyncCache } from "./cache";

export class SyncPrefixStore<V = any> implements SyncCache<V> {
  private cache: SyncCache<V>;
  private prefix: string;
  public readonly operation = 'sync';

  constructor(cache: SyncCache<V>, prefix: string) {
    this.cache = cache;
    this.prefix = prefix;
  }

  private addPrefix(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private removePrefix(key: string): string {
    return key.substring(this.prefix.length + 1);
  }

  set(key: string, value: V): void {
    return this.cache.set(this.addPrefix(key), value);
  }

  get(key: string): V | undefined{
    return this.cache.get(this.addPrefix(key));
  }

  remove(key: string): void {
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
        map.set(this.removePrefix(key), value);        
      }
    });
    return map;
  }
}


export class AyncPrefixStore<V = any> implements AsyncCache<V> {
  private cache: AsyncCache<V>;
  private prefix: string;
  public readonly operation = 'async';

  constructor(cache: AsyncCache<V>, prefix: string) {
    this.cache = cache;
    this.prefix = prefix;
  }

  private addPrefix(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private removePrefix(key: string): string {
    return key.substring(this.prefix.length + 1);
  }

  set(key: string, value: V): Promise<void> {
    return this.cache.set(this.addPrefix(key), value);
  }

  get(key: string): Promise<V | undefined> {
    return this.cache.get(this.addPrefix(key));
  }

  remove(key: string): Promise<void> {
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
        map.set(this.removePrefix(key), value)
      }
    });
    return map;
  }
}
