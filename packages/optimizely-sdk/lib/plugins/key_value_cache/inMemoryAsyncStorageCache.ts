/**
 * Copyright 2022, Optimizely
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

import PersistentKeyValueCache from './persistentKeyValueCache';

/**
 * An in-memory singleton string cache, supporting strings as keys and value.
 */
export default class InMemoryAsyncStorageCache implements PersistentKeyValueCache {
  private readonly data: Map<string, string>;

  private constructor(data: Map<string, string> = new Map<string, string>()) {
    this.data = data;
  }

  private static _instance: InMemoryAsyncStorageCache;

  public static get instance(): InMemoryAsyncStorageCache {
    if (!this._instance) {
      this._instance = new InMemoryAsyncStorageCache();
    }
    return this._instance;
  }

  public static getTestingInstance(data: Map<string, string>): InMemoryAsyncStorageCache {
    return new InMemoryAsyncStorageCache(data);
  }

  /**
   * Checks if a key exists in the cache
   * @param key
   * Resolves promise with
   * 1. true if the key exists
   * 2. false if the key does not exist
   * Rejects the promise in case of an error
   */
  contains(key: string): Promise<boolean> {
    return Promise.resolve(this.data.has(key));
  }

  /**
   * Returns string stored against a key or empty string if not found.
   * @param key
   * @returns
   * Resolves promise with
   * 1. string as value if found.
   * 2. empty string if the key does not exist in the cache.
   * Rejects the promise in case of an error
   */
  get(key: string): Promise<string> {
    const value = this.data.get(key);
    return Promise.resolve(value ? value : '');
  }

  /**
   * Removes the key and value pair from cache.
   * @param key
   * @returns
   * Resolves promise with
   * 1. true if key-value was removed or
   * 2. false if key not found
   * Rejects the promise in case of an error
   */
  remove(key: string): Promise<boolean> {
    return Promise.resolve(this.data.delete(key));
  }

  /**
   * Stores a string in the persistent cache against a key
   * @param key
   * @param val
   * @returns
   * Resolves promise without a value if successful
   * Rejects the promise in case of an error
   */
  set(key: string, val: string): Promise<void> {
    this.data.set(key, val);
    return Promise.resolve();
  }
}
