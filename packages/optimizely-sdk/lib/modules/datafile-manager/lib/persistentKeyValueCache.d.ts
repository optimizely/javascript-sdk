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
 * An Interface to implement a persistent key value cache which supports strings as keys and values.
 */
export default interface PersistentKeyValueCache {
    /**
     * Returns value stored against a key or null if not found.
     * @param key
     * @returns
     * Resolves promise with
     * 1. string if value found was stored as a string.
     * 2. null if the key does not exist in the cache.
     * Rejects the promise in case of an error
     */
    get(key: string): Promise<string>;
    /**
     * Stores string in the persistent cache against a key
     * @param key
     * @param val
     * @returns
     * Resolves promise without a value if successful
     * Rejects the promise in case of an error
     */
    set(key: string, val: string): Promise<void>;
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
     * Removes the key value pair from cache.
     * @param key
     * Resolves promise without a value if successful
     * Rejects the promise in case of an error
     */
    remove(key: string): Promise<void>;
}
