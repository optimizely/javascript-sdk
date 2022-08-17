/**
 * Copyright 2020, 2022, Optimizely
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

/// <reference types="jest" />

import ReactNativeAsyncStorageCache from '../lib/plugins/key_value_cache/reactNativeAsyncStorageCache';

describe('ReactNativeAsyncStorageCache', () => {
  let cacheInstance: ReactNativeAsyncStorageCache;

  beforeEach(() => {
    cacheInstance = new ReactNativeAsyncStorageCache();
  });

  describe('contains', () => {
    it('should return true if value with key exists', async () => {
      const keyWasFound = await cacheInstance.contains('keyThatExists');

      expect(keyWasFound).toEqual(true);
    });

    it('should return false if value with key does not exist', async () => {
      const keyWasFound = await cacheInstance.contains('keyThatDoesNotExist');

      expect(keyWasFound).toEqual(false);
    });
  });

  describe('get', () => {
    it('should return correct string when item is found in cache', async () => {
      const json = await cacheInstance.get('keyThatExists');
      const parsedObject = JSON.parse(json ?? '');

      expect(parsedObject).toEqual({ name: 'Awesome Object' });
    });

    it('should return empty string if item is not found in cache', async () => {
      const json = await cacheInstance.get('keyThatDoesNotExist');

      expect(json).toBeNull();
    });
  });

  describe('remove', () => {
    it('should return true after removing a found entry', async () => {
      const wasSuccessful = await cacheInstance.remove('keyThatExists');

      expect(wasSuccessful).toBeTruthy();
    });

    it('should return false after trying to remove an entry that is not found ', async () => {
      const wasSuccessful = await cacheInstance.remove('keyThatDoesNotExist');

      expect(wasSuccessful).toBeFalsy();
    });
  });

  describe('set', () => {
    it('should resolve promise if item was successfully set in the cache', async () => {
      const testObj = { name: 'Awesome Object' };

      await cacheInstance.set('testKey', JSON.stringify(testObj));
    });
  });
});
