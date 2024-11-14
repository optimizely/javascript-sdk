import { Maybe } from "../type";
import { SyncCache } from "./cache";

export class LocalStorageCache<V> implements SyncCache<V> {
  public readonly operation = 'sync';

  public set(key: string, value: V): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public get(key: string): Maybe<V> {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  }

  public remove(key: string): void {
    localStorage.removeItem(key);
  }

  public clear(): void {
    localStorage.clear();
  }

  public getKeys(): string[] {
    const keys: string[] = [];
    for(let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  getBatched(keys: string[]): Maybe<V>[] {
    return keys.map((k) => this.get(k));
  }
}
