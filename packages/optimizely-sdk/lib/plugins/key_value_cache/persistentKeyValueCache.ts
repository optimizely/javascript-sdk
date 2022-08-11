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

/**
 * An Interface to implement a persistent key value cache which supports strings as keys and value objects.
 */
export default interface PersistentKeyValueCache {
  /**
   * Checks if a key exists in the cache
   * @param key
   * Resolves promise with
   * 1. true if the key exists
   * 2. false if the key does not exist
   * Rejects the promise in case of an error
   */
  contains(key: string): Promise<boolean>;

  /**
   * Returns value stored against a key or undefined if not found.
   * @param key
   * @returns
   * Resolves promise with
   * 1. object as value if found.
   * 2. undefined if the key does not exist in the cache.
   * Rejects the promise in case of an error
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  get(key: string): Promise<any | undefined>;

  /**
   * Removes the key value pair from cache.
   * @param key   *
   * @returns
   * Resolves promise with
   * 1. true if key-value was removed or
   * 2. false if key not found
   * Rejects the promise in case of an error
   */
  remove(key: string): Promise<boolean>;

  /**
   * Stores any object in the persistent cache against a key
   * @param key
   * @param val
   * @returns
   * Resolves promise without a value if successful
   * Rejects the promise in case of an error
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  set(key: string, val: any): Promise<void>;
}
