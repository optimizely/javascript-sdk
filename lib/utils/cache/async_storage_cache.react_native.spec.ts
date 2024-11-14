

vi.mock('@react-native-async-storage/async-storage', () => {
  const MockAsyncStorage = {
    data: new Map<string, any>(),
    async setItem(key: string, value: string) {
      this.data.set(key, value);
    },
    async getItem(key: string) {
      return this.data.get(key) || null;
    },
    async removeItem(key: string) {
      this.data.delete(key);
    },
    async getAllKeys() {
      return Array.from(this.data.keys());
    },
    async clear() {
      this.data.clear();
    },
    async multiGet(keys: string[]) {
      return keys.map(key => [key, this.data.get(key)]);
    },
  }
  return { default: MockAsyncStorage };
});

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AsyncStorageCache } from './async_storage_cache.react_native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TestData = {
  a: number;
  b: string;
  d: { e: boolean };
}


describe('AsyncStorageCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should store a stringified value in asyncstorage', async () => {
    const cache = new AsyncStorageCache<TestData>();
    const data = { a: 1, b: '2', d: { e: true } };
    await cache.set('key', data);
    expect(await AsyncStorage.getItem('key')).toBe(JSON.stringify(data));
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
    expect(await AsyncStorage.getItem('key')).toBeNull();
  });

  it('should remove all keys from async storage when clear is called', async () => {
    const cache = new AsyncStorageCache<string>();
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    expect((await AsyncStorage.getAllKeys()).length).toBe(2);
    cache.clear();
    expect((await AsyncStorage.getAllKeys()).length).toBe(0);
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
