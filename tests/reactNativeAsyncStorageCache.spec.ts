/**
 * Copyright 2020, 2022, 2024, Optimizely
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

import { describe, beforeEach, it, vi, expect } from 'vitest';
import ReactNativeAsyncStorageCache from '../lib/plugins/key_value_cache/reactNativeAsyncStorageCache';

vi.mock('@react-native-async-storage/async-storage')

describe('ReactNativeAsyncStorageCache', () => {
  const TEST_OBJECT_KEY = 'testObject';
  const testObject = { name: 'An object', with: { some: 2, properties: ['one', 'two'] } };
  let cacheInstance: ReactNativeAsyncStorageCache;

  beforeEach(() => {
    cacheInstance = new ReactNativeAsyncStorageCache();
    cacheInstance.set(TEST_OBJECT_KEY, JSON.stringify(testObject));
  });

  describe('contains', () => {
    it('should return true if value with key exists', async () => {
      const keyWasFound = await cacheInstance.contains(TEST_OBJECT_KEY);

      expect(keyWasFound).toBe(true);
    });

    it('should return false if value with key does not exist', async () => {
      const keyWasFound = await cacheInstance.contains('keyThatDoesNotExist');

      expect(keyWasFound).toBe(false);
    });
  });

  describe('get', () => {
    it('should return correct string when item is found in cache', async () => {
      const json = await cacheInstance.get(TEST_OBJECT_KEY);
      const parsedObject = JSON.parse(json ?? '');

      expect(parsedObject).toEqual(testObject);
    });

    it('should return undefined if item is not found in cache', async () => {
      const json = await cacheInstance.get('keyThatDoesNotExist');

      expect(json).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should return true after removing a found entry', async () => {
      const wasSuccessful = await cacheInstance.remove(TEST_OBJECT_KEY);

      expect(wasSuccessful).toBe(true);
    });

    it('should return false after trying to remove an entry that is not found ', async () => {
      const wasSuccessful = await cacheInstance.remove('keyThatDoesNotExist');

      expect(wasSuccessful).toBe(false);
    });
  });
});
