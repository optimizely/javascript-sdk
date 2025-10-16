/**
 * Copyright 2022-2025, Optimizely
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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transformCache, SyncCacheWithRemove, AsyncCacheWithRemove, CacheWithRemove } from './cache';
import { getMockSyncCache, getMockAsyncCache } from '../../tests/mock/mock_cache';

const numberToString = (value: number): string => value.toString();
const stringToNumber = (value: string): number => parseInt(value, 10);

describe('transformCache', () => {
  describe('sync cache operations', () => {
    let mockCache: SyncCacheWithRemove<string>;
    let transformedCache: CacheWithRemove<number>;

    beforeEach(() => {
      mockCache = getMockSyncCache<string>();
      transformedCache = transformCache(mockCache, stringToNumber, numberToString);
    });

    it('should transform and save values using transformSet', () => {
      const value = 42;
      const key = 'test-key';

      transformedCache.save(key, value);

      expect(mockCache.lookup(key)).toBe('42');
    });

    it('should lookup and transform values using transformGet when value exists', () => {
      const key = 'test-key';
      const storedValue = '123';

      mockCache.save(key, storedValue);

      const result = transformedCache.lookup(key);
      expect(result).toBe(123);
    });

    it('should return undefined when lookup value does not exist', () => {
      const key = 'non-existent-key';

      const result = transformedCache.lookup(key);
      expect(result).toBeUndefined();
    });

    it('should return the saved value on lookup', () => {
      const key = 'sample-key';
      const value = 100;
      
      transformedCache.save(key, value);
      const result = transformedCache.lookup(key);
      expect(result).toBe(value);
    });

    it('should reset the cache when reset is called', () => {
      transformedCache.save('key1', 42);
      transformedCache.save('key2', 1729);

      transformedCache.reset();

      expect(mockCache.lookup('key1')).toBeUndefined();
      expect(mockCache.lookup('key2')).toBeUndefined();
      expect(transformedCache.lookup('key1')).toBeUndefined();
      expect(transformedCache.lookup('key2')).toBeUndefined();
    });

    it('should remove the key from the cache when remove is called', () => {
      const key = 'test-key';
      transformedCache.save(key, 99);

      expect(transformedCache.lookup(key)).toBe(99);

      transformedCache.remove(key);
      expect(mockCache.lookup(key)).toBeUndefined();
      expect(transformedCache.lookup(key)).toBeUndefined();
    });

    it('should preserve original cache operation type', () => {
      expect(transformedCache.operation).toBe('sync');
    });
  });

  describe('async cache operations', () => {
    let mockAsyncCache: AsyncCacheWithRemove<string>;
    let transformedAsyncCache: CacheWithRemove<number>;

    beforeEach(() => {
      mockAsyncCache = getMockAsyncCache<string>();
      transformedAsyncCache = transformCache(mockAsyncCache, stringToNumber, numberToString);
    });

    it('should transform and save values using transformSet', async () => {
      const value = 42;
      const key = 'test-key';

      await transformedAsyncCache.save(key, value);

      const result = await mockAsyncCache.lookup(key);
      expect(result).toBe('42');
    });

    it('should lookup and transform values using transformGet when value exists', async () => {
      const key = 'test-key';
      const storedValue = '123';

      await mockAsyncCache.save(key, storedValue);

      const result = await transformedAsyncCache.lookup(key);
      expect(result).toBe(123);
    });

    it('should return undefined when lookup value does not exist', async () => {
      const key = 'non-existent-key';

      const result = await transformedAsyncCache.lookup(key);
      expect(result).toBeUndefined();
    });

    it('should return the saved value on lookup', async () => {
      const key = 'sample-key';
      const value = 100;
      
      await transformedAsyncCache.save(key, value);
      const result = await transformedAsyncCache.lookup(key);
      expect(result).toBe(value);
    });

    it('should reset the cache when reset is called', async () => {
      await transformedAsyncCache.save('key1', 42);
      await transformedAsyncCache.save('key2', 1729);

      await transformedAsyncCache.reset();

      await expect(mockAsyncCache.lookup('key1')).resolves.toBeUndefined();
      await expect(mockAsyncCache.lookup('key2')).resolves.toBeUndefined();

      await expect(transformedAsyncCache.lookup('key1')).resolves.toBeUndefined();
      await expect(transformedAsyncCache.lookup('key2')).resolves.toBeUndefined();
    });

    it('should remove the key from the cache when remove is called', async () => {
      const key = 'test-key';
      await transformedAsyncCache.save(key, 99);

      await expect(transformedAsyncCache.lookup(key)).resolves.toBe(99);

      await transformedAsyncCache.remove(key);

      await expect(mockAsyncCache.lookup(key)).resolves.toBeUndefined();
      await expect(transformedAsyncCache.lookup(key)).resolves.toBeUndefined();
    });

    it('should preserve original cache operation type', () => {
      expect(transformedAsyncCache.operation).toBe('async');
    });
  });
});