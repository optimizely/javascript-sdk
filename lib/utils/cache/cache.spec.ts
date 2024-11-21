/**
 * Copyright 2022-2024, Optimizely
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

import { describe, it, expect } from 'vitest';
import { SyncPrefixCache, AsyncPrefixCache } from './cache';
import { getMockSyncCache, getMockAsyncCache } from '../../tests/mock/mock_cache';

describe('SyncPrefixCache', () => {
  describe('set', () => {
    it('should add prefix to key when setting in the underlying cache', () => {
      const cache = getMockSyncCache<string>();
      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      prefixCache.set('key', 'value');
      expect(cache.get('prefix:key')).toEqual('value');
    });

    it('should transform value when setting in the underlying cache', () => {
      const cache = getMockSyncCache<string>();
      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      prefixCache.set('key', 'value');
      expect(cache.get('prefix:key')).toEqual('VALUE');
    });

    it('should work correctly with empty prefix', () => {
      const cache = getMockSyncCache<string>();
      const prefixCache = new SyncPrefixCache(cache, '', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      prefixCache.set('key', 'value');
      expect(cache.get('key')).toEqual('VALUE');
    });
  });

  describe('get', () => {
    it('should remove prefix from key when getting from the underlying cache', () => {
      const cache = getMockSyncCache<string>();
      cache.set('prefix:key', 'value');
      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      expect(prefixCache.get('key')).toEqual('value');
    });

    it('should transform value after getting from the underlying cache', () => {
      const cache = getMockSyncCache<string>();
      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      cache.set('prefix:key', 'VALUE');
      expect(prefixCache.get('key')).toEqual('value');
    });


    it('should work correctly with empty prefix', () => {
      const cache = getMockSyncCache<string>();
      const prefixCache = new SyncPrefixCache(cache, '', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      cache.set('key', 'VALUE');
      expect(prefixCache.get('key')).toEqual('value');
    });
  });

  describe('remove', () => {
    it('should remove the correct value from the underlying cache', () => {
      const cache = getMockSyncCache<string>();
      cache.set('prefix:key', 'value');
      cache.set('key', 'value');
      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      prefixCache.remove('key');
      expect(cache.get('prefix:key')).toBeUndefined();
      expect(cache.get('key')).toEqual('value');
    });

    it('should work with empty prefix', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key', 'value');
      const prefixCache = new SyncPrefixCache(cache, '', (v) => v, (v) => v);
      prefixCache.remove('key');
      expect(cache.get('key')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove keys with correct prefix from the underlying cache', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('prefix:key1', 'value1');
      cache.set('prefix:key2', 'value2');

      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      prefixCache.clear();

      expect(cache.get('key1')).toEqual('value1');
      expect(cache.get('key2')).toEqual('value2');
      expect(cache.get('prefix:key1')).toBeUndefined();
      expect(cache.get('prefix:key2')).toBeUndefined();
    });

    it('should work with empty prefix', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const prefixCache = new SyncPrefixCache(cache, '', (v) => v, (v) => v);
      prefixCache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('getKeys', () => {
    it('should return keys with correct prefix', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('prefix:key3', 'value1');
      cache.set('prefix:key4', 'value2');

      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);

      const keys = prefixCache.getKeys();
      expect(keys).toEqual(expect.arrayContaining(['key3', 'key4']));
    });

    it('should work with empty prefix', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const prefixCache = new SyncPrefixCache(cache, '', (v) => v, (v) => v);

      const keys = prefixCache.getKeys();
      expect(keys).toEqual(expect.arrayContaining(['key1', 'key2']));
    });
  });

  describe('getBatched', () => {
    it('should return values with correct prefix', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('prefix:key1', 'prefix:value1');
      cache.set('prefix:key2', 'prefix:value2');

      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);

      const values = prefixCache.getBatched(['key1', 'key2', 'key3']);
      expect(values).toEqual(expect.arrayContaining(['prefix:value1', 'prefix:value2', undefined]));
    });

    it('should transform values after getting from the underlying cache', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key1', 'VALUE1');
      cache.set('key2', 'VALUE2');
      cache.set('key3', 'VALUE3');
      cache.set('prefix:key1', 'PREFIX:VALUE1');
      cache.set('prefix:key2', 'PREFIX:VALUE2');

      const prefixCache = new SyncPrefixCache(cache, 'prefix:', (v) => v.toLocaleLowerCase(), (v) => v.toUpperCase());

      const values = prefixCache.getBatched(['key1', 'key2', 'key3']);
      expect(values).toEqual(expect.arrayContaining(['prefix:value1', 'prefix:value2', undefined]));
    });

    it('should work with empty prefix', () => {
      const cache = getMockSyncCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const prefixCache = new SyncPrefixCache(cache, '', (v) => v, (v) => v);

      const values = prefixCache.getBatched(['key1', 'key2']);
      expect(values).toEqual(expect.arrayContaining(['value1', 'value2']));
    });
  });
});

describe('AsyncPrefixCache', () => {
  describe('set', () => {
    it('should add prefix to key when setting in the underlying cache', async () => {
      const cache = getMockAsyncCache<string>();
      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      await prefixCache.set('key', 'value');
      expect(await cache.get('prefix:key')).toEqual('value');
    });

    it('should transform value when setting in the underlying cache', async () => {
      const cache = getMockAsyncCache<string>();
      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      await prefixCache.set('key', 'value');
      expect(await cache.get('prefix:key')).toEqual('VALUE');
    });

    it('should work correctly with empty prefix', async () => {
      const cache = getMockAsyncCache<string>();
      const prefixCache = new AsyncPrefixCache(cache, '', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      await prefixCache.set('key', 'value');
      expect(await cache.get('key')).toEqual('VALUE');
    });
  });

  describe('get', () => {
    it('should remove prefix from key when getting from the underlying cache', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('prefix:key', 'value');
      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      expect(await prefixCache.get('key')).toEqual('value');
    });

    it('should transform value after getting from the underlying cache', async () => {
      const cache = getMockAsyncCache<string>();
      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      await cache.set('prefix:key', 'VALUE');
      expect(await prefixCache.get('key')).toEqual('value');
    });


    it('should work correctly with empty prefix', async () => {
      const cache = getMockAsyncCache<string>();
      const prefixCache = new AsyncPrefixCache(cache, '', (v) => v.toLowerCase(), (v) => v.toUpperCase());
      await cache.set('key', 'VALUE');
      expect(await prefixCache.get('key')).toEqual('value');
    });
  });

  describe('remove', () => {
    it('should remove the correct value from the underlying cache', async () => {
      const cache = getMockAsyncCache<string>();
      cache.set('prefix:key', 'value');
      cache.set('key', 'value');
      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      await prefixCache.remove('key');
      expect(await cache.get('prefix:key')).toBeUndefined();
      expect(await cache.get('key')).toEqual('value');
    });

    it('should work with empty prefix', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key', 'value');
      const prefixCache = new AsyncPrefixCache(cache, '', (v) => v, (v) => v);
      await prefixCache.remove('key');
      expect(await cache.get('key')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove keys with correct prefix from the underlying cache', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('prefix:key1', 'value1');
      await cache.set('prefix:key2', 'value2');

      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);
      await prefixCache.clear();

      expect(await cache.get('key1')).toEqual('value1');
      expect(await cache.get('key2')).toEqual('value2');
      expect(await cache.get('prefix:key1')).toBeUndefined();
      expect(await cache.get('prefix:key2')).toBeUndefined();
    });

    it('should work with empty prefix', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const prefixCache = new AsyncPrefixCache(cache, '', (v) => v, (v) => v);
      await prefixCache.clear();

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
    });
  });

  describe('getKeys', () => {
    it('should return keys with correct prefix', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('prefix:key3', 'value1');
      await cache.set('prefix:key4', 'value2');

      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);

      const keys = await prefixCache.getKeys();
      expect(keys).toEqual(expect.arrayContaining(['key3', 'key4']));
    });

    it('should work with empty prefix', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const prefixCache = new AsyncPrefixCache(cache, '', (v) => v, (v) => v);

      const keys = await prefixCache.getKeys();
      expect(keys).toEqual(expect.arrayContaining(['key1', 'key2']));
    });
  });

  describe('getBatched', () => {
    it('should return values with correct prefix', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      await cache.set('prefix:key1', 'prefix:value1');
      await cache.set('prefix:key2', 'prefix:value2');

      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v, (v) => v);

      const values = await prefixCache.getBatched(['key1', 'key2', 'key3']);
      expect(values).toEqual(expect.arrayContaining(['prefix:value1', 'prefix:value2', undefined]));
    });

    it('should transform values after getting from the underlying cache', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key1', 'VALUE1');
      await cache.set('key2', 'VALUE2');
      await cache.set('key3', 'VALUE3');
      await cache.set('prefix:key1', 'PREFIX:VALUE1');
      await cache.set('prefix:key2', 'PREFIX:VALUE2');

      const prefixCache = new AsyncPrefixCache(cache, 'prefix:', (v) => v.toLocaleLowerCase(), (v) => v.toUpperCase());

      const values = await prefixCache.getBatched(['key1', 'key2', 'key3']);
      expect(values).toEqual(expect.arrayContaining(['prefix:value1', 'prefix:value2', undefined]));
    });

    it('should work with empty prefix', async () => {
      const cache = getMockAsyncCache<string>();
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const prefixCache = new AsyncPrefixCache(cache, '', (v) => v, (v) => v);

      const values = await prefixCache.getBatched(['key1', 'key2']);
      expect(values).toEqual(expect.arrayContaining(['value1', 'value2']));
    });
  });
});