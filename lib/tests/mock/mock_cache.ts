import { SyncCache } from "../../utils/cache/cache";

export const getMockSyncCache = <T>(): SyncCache<T> => {
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

