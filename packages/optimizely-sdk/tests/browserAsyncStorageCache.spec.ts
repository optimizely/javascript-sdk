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

/// <reference types="jest" />

import BrowserAsyncStorageCache from '../lib/plugins/key_value_cache/browserAsyncStorageCache';

describe('BrowserAsyncStorageCache', () => {
  const KEY_THAT_EXISTS = 'keyThatExists';
  const VALUE_FOR_KEY_THAT_EXISTS = 'some really super value that exists for keyThatExists';
  const NONEXISTENT_KEY = 'someKeyThatDoesNotExist';

  let cacheInstance: BrowserAsyncStorageCache;

  beforeEach(() => {
    const stubData = new Map<string, string>();
    stubData.set(KEY_THAT_EXISTS, VALUE_FOR_KEY_THAT_EXISTS);

    cacheInstance = new BrowserAsyncStorageCache();

    jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation((key) => key == KEY_THAT_EXISTS ? VALUE_FOR_KEY_THAT_EXISTS : null);
    jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => 1);
    jest
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation((key) => key == KEY_THAT_EXISTS);
  });

  describe('contains', () => {
    it('should return true if value with key exists', async () => {
      const keyWasFound = await cacheInstance.contains(KEY_THAT_EXISTS);

      expect(keyWasFound).toEqual(true);
    });

    it('should return false if value with key does not exist', async () => {
      const keyWasFound = await cacheInstance.contains(NONEXISTENT_KEY);

      expect(keyWasFound).toEqual(false);
    });
  });

  describe('get', () => {
    it('should return correct string when item is found in cache', async () => {
      const foundValue = await cacheInstance.get(KEY_THAT_EXISTS);

      expect(foundValue).toEqual(VALUE_FOR_KEY_THAT_EXISTS);
    });

    it('should return empty string if item is not found in cache', async () => {
      const json = await cacheInstance.get(NONEXISTENT_KEY);

      expect(json).toBeNull();
    });
  });

  describe('remove', () => {
    it('should return true after removing a found entry', async () => {
      const wasSuccessful = await cacheInstance.remove(KEY_THAT_EXISTS);

      expect(wasSuccessful).toEqual(true);
    });

    it('should return false after trying to remove an entry that is not found ', async () => {
      const wasSuccessful = await cacheInstance.remove(NONEXISTENT_KEY);

      expect(wasSuccessful).toEqual(false);
    });
  });

  describe('set', () => {
    it('should resolve promise if item was successfully set in the cache', async () => {
      await cacheInstance.set('newTestKey', 'a value for this newTestKey');
    });
  });
});
