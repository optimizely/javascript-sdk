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

  describe('get', () => {
    it('should return correct string when item is found in cache', async () => {
      cacheInstance.get('keyThatExists').then(v => expect(JSON.parse(v)).toEqual({ name: 'Awesome Object' }));
    });

    it('should return empty string if item is not found in cache', function() {
      cacheInstance.get('keyThatDoesNotExist').then(v => expect(v).toEqual(''));
    });
  });

  describe('set', () => {
    it('should resolve promise if item was successfully set in the cache', function() {
      const testObj = { name: 'Awesome Object' };
      cacheInstance.set('testKey', JSON.stringify(testObj));
    });
  });

  describe('contains', () => {
    it('should return true if value with key exists', function() {
      cacheInstance.contains('keyThatExists').then(v => expect(v).toBeTruthy());
    });

    it('should return false if value with key does not exist', function() {
      cacheInstance.contains('keyThatDoesNotExist').then(v => expect(v).toBeFalsy());
    });
  });
});
