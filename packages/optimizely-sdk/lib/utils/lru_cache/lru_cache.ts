/**
 * Copyright 2022-2023, Optimizely
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

import CacheElement from './cache_element';

/**
 * Least-Recently Used Cache (LRU Cache) Implementation with Generic Key-Value Pairs
 * Analogous to a Map that has a specified max size and a timeout per element.
 * - Removes the least-recently used element from the cache if max size exceeded.
 * - Removes stale elements (entries older than their timeout) from the cache.
 */
export class LRUCache<K, V> {
  private _map: Map<K, CacheElement<V>> = new Map();
  private _maxSize; // Defines maximum size of _map
  private _timeout; // Milliseconds each entry has before it becomes stale

  get map(): Map<K, CacheElement<V>> {
    return this._map;
  }
  get maxSize(): number {
    return this._maxSize;
  }
  get timeout(): number {
    return this._timeout;
  }

  constructor({ maxSize, timeout }: { maxSize: number; timeout: number }) {
    this._maxSize = maxSize;
    this._timeout = timeout;
  }

  /**
   * Returns a valid, non-stale value from LRU Cache based on an input key.
   * Additionally moves the element to the end of the cache and removes from cache if stale.
   */
  public lookup(key: K): V | null {
    if (this._maxSize <= 0) {
      return null;
    }

    const element: CacheElement<V> | undefined = this._map.get(key);

    if (!element) return null;

    if (element.is_stale(this._timeout)) {
      this._map.delete(key);
      return null;
    }

    this._map.delete(key);
    this._map.set(key, element);

    return element.value;
  }

  /**
   * Inserts/moves an input key-value pair to the end of the LRU Cache.
   * Removes the least-recently used element if the cache exceeds it's maxSize.
   */
  public save({ key, value }: { key: K; value: V }): void {
    if (this._maxSize <= 0) return;

    const element: CacheElement<V> | undefined = this._map.get(key);
    if (element) this._map.delete(key);
    this._map.set(key, new CacheElement(value));

    if (this._map.size > this._maxSize) {
      const firstMapEntryKey = this._map.keys().next().value;
      this._map.delete(firstMapEntryKey);
    }
  }

  /**
   * Clears the LRU Cache
   */
  public reset(): void {
    if (this._maxSize <= 0) return;

    this._map.clear();
  }

  /**
   * Reads value from specified key without moving elements in the LRU Cache.
   * @param {K} key
   */
  public peek(key: K): V | null {
    if (this._maxSize <= 0) return null;

    const element: CacheElement<V> | undefined = this._map.get(key);

    return element?.value ?? null;
  }
}

export interface ISegmentsCacheConfig {
  DEFAULT_CAPACITY: number;
  DEFAULT_TIMEOUT_SECS: number;
}

export default LRUCache;
