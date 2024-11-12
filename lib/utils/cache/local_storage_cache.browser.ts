import { SyncCache } from "./cache";

export class LocalStorageCache<V> implements SyncCache<V> {
  public readonly operation = 'sync';

  public set(key: string, value: V): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public get(key: string): V | undefined {
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

  public getAll(): Map<string, V> {
    const map = new Map<string, V>();
    this.getKeys().forEach((key) => {
      const value = this.get(key);
      if (value) {
        map.set(key, value);
      }
    });
    return map;
  }
}
