/**
 * Copyright 2022-2025, Optimizely
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

import { Maybe } from "../type";
import { AsyncStore } from "./store";
import { getDefaultAsyncStorage } from "../import.react_native/@react-native-async-storage/async-storage";
import { extractValue, serializeValue } from "./serializer";
export class AsyncStorageCache<V> implements AsyncStore<V> {
  private ttlMs?: number;
  public readonly operation = 'async';
  private asyncStorage = getDefaultAsyncStorage();

  constructor(ttlMs?: number ) {
    this.ttlMs = ttlMs;
  }

  private getIfNotExpired(key: string, data: string | null): Maybe<V> {
    if (!data) return undefined;
    const { value, createdAt } = extractValue<V>(data);

    if (createdAt === 0) {
      // old format without TTL, update to new format using current timestamp
      this.set(key, value).catch(() => {}); // don't await to avoid latency
      return value;
    }
    
    // remove expired item
    if (this.ttlMs && createdAt + this.ttlMs < Date.now()) {
      this.remove(key).catch(() => {}); // don't await to avoid latency
      return undefined;
    }

    return value;
  }

  async get(key: string): Promise<V | undefined> {
    const data = await this.asyncStorage.getItem(key);

    return this.getIfNotExpired(key, data);
  }

  async remove(key: string): Promise<unknown> {
    return this.asyncStorage.removeItem(key);
  }

  async set(key: string, val: V): Promise<unknown> {
    return this.asyncStorage.setItem(key, serializeValue(val));
  }

  async clear(): Promise<unknown> {
    return this.asyncStorage.clear();
  }

  async getKeys(): Promise<string[]> {
    return [... await this.asyncStorage.getAllKeys()];
  }

  async getBatched(keys: string[]): Promise<Maybe<V>[]> {
    const items = await this.asyncStorage.multiGet(keys);
    return items.map(([key, value]) => this.getIfNotExpired(key, value));
  }
}
