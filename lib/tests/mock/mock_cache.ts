import { SyncCache } from "../../utils/cache/cache";
import { Maybe } from "../../utils/type";

type SyncCacheWithAddOn<T> = SyncCache<T> & {
  size(): number;
  getAll(): Map<string, T>;
};

export const getMockSyncCache = <T>(): SyncCacheWithAddOn<T> => {
  const cache = {
    operation: 'sync' as const,
    data: new Map<string, T>(),
    remove(key: string): void {
      this.data.delete(key);
    },
    clear(): void {
      this.data.clear();
    },
    getKeys(): string[] {
      return Array.from(this.data.keys());
    },
    getAll(): Map<string, T> {
      return this.data;
    },
    getBatched(keys: string[]): Maybe<T>[] {
      return keys.map((key) => this.get(key));
    },
    size(): number {
      return this.data.size;
    },
    get(key: string): T | undefined {
      return this.data.get(key);
    },
    set(key: string, value: T): void {
      this.data.set(key, value);
    }
  }

  return cache;
};

