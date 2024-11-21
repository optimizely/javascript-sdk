/**
 * Copyright 2022-2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SyncCache, AsyncCache } from "../../utils/cache/cache";
import { Maybe } from "../../utils/type";

type SyncCacheWithAddOn<T> = SyncCache<T> & {
  size(): number;
  getAll(): Map<string, T>;
};

type AsyncCacheWithAddOn<T> = AsyncCache<T> & {
  size(): Promise<number>;
  getAll(): Promise<Map<string, T>>;
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


export const getMockAsyncCache = <T>(): AsyncCacheWithAddOn<T> => {
  const cache = {
    operation: 'async' as const,
    data: new Map<string, T>(),
    async remove(key: string): Promise<void> {
      this.data.delete(key);
    },
    async clear(): Promise<void> {
      this.data.clear();
    },
    async getKeys(): Promise<string[]> {
      return Array.from(this.data.keys());
    },
    async getAll(): Promise<Map<string, T>> {
      return this.data;
    },
    async getBatched(keys: string[]): Promise<Maybe<T>[]> {
      return Promise.all(keys.map((key) => this.get(key)));
    },
    async size(): Promise<number> {
      return this.data.size;
    },
    async get(key: string): Promise<Maybe<T>> {
      return this.data.get(key);
    },
    async set(key: string, value: T): Promise<void> {
      this.data.set(key, value);
    }
  }

  return cache;
};
