/**
 * Copyright 2022-2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Maybe } from "../type";
import { SyncCacheWithRemove } from "./cache";

type CacheElement<V> = {
  value: V;
  expiresAt?: number;
};

export class InMemoryLruCache<V> implements SyncCacheWithRemove<V> {
  public operation = 'sync' as const;
  private data: Map<string, CacheElement<V>> = new Map();
  private maxSize: number; 
  private ttl?: number;

  constructor(maxSize: number, ttl?: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  lookup(key: string): Maybe<V> {
    const element = this.data.get(key);
    if (!element) return undefined;
    this.data.delete(key);

    if (element.expiresAt && element.expiresAt <= Date.now()) {
      return undefined;
    }

    this.data.set(key, element);
    return element.value;
  }

  save(key: string, value: V): void {
    this.data.delete(key);

    if (this.data.size === this.maxSize) {
      const firstMapEntryKey = this.data.keys().next().value;
      this.data.delete(firstMapEntryKey!);
    }

    this.data.set(key, {
      value,
      expiresAt: this.ttl ? Date.now() + this.ttl : undefined,
    });
  }

  remove(key: string): void {
    this.data.delete(key);
  }

  reset(): void {
    this.data.clear();
  }

  getKeys(): string[] {
    return Array.from(this.data.keys());
  }
}
