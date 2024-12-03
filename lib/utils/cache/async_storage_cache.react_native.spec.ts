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

import { vi, describe, it, expect } from 'vitest';
import { AsyncStorageCache } from './async_storage_cache.react_native';
import { getDefaultAsyncStorage } from '../import.react_native/@react-native-async-storage/async-storage';

vi.mock('@react-native-async-storage/async-storage');

type TestData = {
  a: number;
  b: string;
  d: { e: boolean };
};

describe('AsyncStorageCache', () => {
  const asyncStorage = getDefaultAsyncStorage();

  it('should store a stringified value in async storage', async () => {
    const cache = new AsyncStorageCache<TestData>();

    const data = { a: 1, b: '2', d: { e: true } };
    await cache.set('key', data);

    expect(await asyncStorage.getItem('key')).toBe(JSON.stringify(data));
    expect(await cache.get('key')).toEqual(data);
  });

  it('should return undefined if get is called for a nonexistent key', async () => {
    const cache = new AsyncStorageCache<string>();

    expect(await cache.get('nonexistent')).toBeUndefined();
  });

  it('should return the value if get is called for an existing key', async () => {
    const cache = new AsyncStorageCache<string>();
    await cache.set('key', 'value');

    expect(await cache.get('key')).toBe('value');
  });

  it('should return the value after json parsing if get is called for an existing key', async () => {
    const cache = new AsyncStorageCache<TestData>();
    const data = { a: 1, b: '2', d: { e: true } };
    await cache.set('key', data);

    expect(await cache.get('key')).toEqual(data);
  });

  it('should remove the key from async storage when remove is called', async () => {
    const cache = new AsyncStorageCache<string>();
    await cache.set('key', 'value');
    await cache.remove('key');

    expect(await asyncStorage.getItem('key')).toBeNull();
  });

  it('should remove all keys from async storage when clear is called', async () => {
    const cache = new AsyncStorageCache<string>();
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    expect((await asyncStorage.getAllKeys()).length).toBe(2);
    cache.clear();
    expect((await asyncStorage.getAllKeys()).length).toBe(0);
  });

  it('should return all keys when getKeys is called', async () => {
    const cache = new AsyncStorageCache<string>();
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    expect(await cache.getKeys()).toEqual(['key1', 'key2']);
  });

  it('should return an array of values for an array of keys when getBatched is called', async () => {
    const cache = new AsyncStorageCache<string>();
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    expect(await cache.getBatched(['key1', 'key2'])).toEqual(['value1', 'value2']);
  });
});
