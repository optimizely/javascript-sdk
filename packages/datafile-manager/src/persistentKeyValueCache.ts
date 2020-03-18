/**
 * Copyright 2020, Optimizely
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

/**
 * An Interface to implement a persistent key value cache which supports strings as keys
 * and JSON Object as value.
 */
export default interface PersistentKeyValueCache {
  
  /**
   * Returns value stored against a key or null if not found.
   * @param key 
   * @returns Promise which resolves with a
   * 1. Object if value found was stored as a JSON Object.
   * 2. null if the key does not exist in the cache.
   */
  get(key: string): Promise<Object | null>

  /**
   * Stores Object in the persistent cache against a key
   * @param key 
   * @param val 
   */
  set(key: string, val: Object): Promise<void>

  /**
   * Checks if a key exists in the cache
   * @param key 
   */
  contains(key: string): Promise<Boolean>

  /**
   * Removed the key value pair from cache.
   * @param key 
   */
  remove(key: string): Promise<void>
}
