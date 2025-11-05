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
import { extractValue, serializeValue } from "./serializer";
import { SyncStore } from "./store";

export class LocalStorageCache<V> implements SyncStore<V> {
  private ttlMs?: number;
  public readonly operation = 'sync';

  constructor(ttlMs?: number ) {
    this.ttlMs = ttlMs;
  }


  public set(key: string, value: V): void {
    localStorage.setItem(key, serializeValue(value));
  }

  public get(key: string): Maybe<V> {
    const data = localStorage.getItem(key);
    if (!data) return undefined;

    const { value, createdAt } = extractValue<V>(data);

    if (createdAt === 0) {
      // old format without TTL, update to new format using current timestamp
      this.set(key, value);
      return value;
    }
    
    // remove expired item
    if (this.ttlMs && createdAt + this.ttlMs < Date.now()) {
      this.remove(key);
      return undefined;
    }

    return value;
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
