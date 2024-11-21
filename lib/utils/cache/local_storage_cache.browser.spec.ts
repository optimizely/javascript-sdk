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

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageCache } from './local_storage_cache.browser';

type TestData = {
  a: number;
  b: string;
  d: { e: boolean };
}

describe('LocalStorageCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store a stringified value in local storage', () => {
    const cache = new LocalStorageCache<TestData>();
    const data = { a: 1, b: '2', d: { e: true } };
    cache.set('key', data);
    expect(localStorage.getItem('key')).toBe(JSON.stringify(data));
  });

  it('should return undefined if get is called for a nonexistent key', () => {
    const cache = new LocalStorageCache<string>();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should return the value if get is called for an existing key', () => {
    const cache = new LocalStorageCache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should return the value after json parsing if get is called for an existing key', () => {
    const cache = new LocalStorageCache<TestData>();
    const data = { a: 1, b: '2', d: { e: true } };
    cache.set('key', data);
    expect(cache.get('key')).toEqual(data);
  });

  it('should remove the key from local storage when remove is called', () => {
    const cache = new LocalStorageCache<string>();
    cache.set('key', 'value');
    cache.remove('key');
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('should remove all keys from local storage when clear is called', () => {
    const cache = new LocalStorageCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(localStorage.length).toBe(2);
    cache.clear();
    expect(localStorage.length).toBe(0);
  });

  it('should return all keys when getKeys is called', () => {
    const cache = new LocalStorageCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.getKeys()).toEqual(['key1', 'key2']);
  });

  it('should return an array of values for an array of keys when getBatched is called', () => {
    const cache = new LocalStorageCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.getBatched(['key1', 'key2'])).toEqual(['value1', 'value2']);
  });
});
