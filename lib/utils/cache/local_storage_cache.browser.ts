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
    return Object.keys(localStorage);
  }

  getBatched(keys: string[]): Maybe<V>[] {
    return keys.map((k) => this.get(k));
  }
}
