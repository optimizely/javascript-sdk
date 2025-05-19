/**
 * Copyright 2024-2025, Optimizely
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
import { expect,  describe, it } from 'vitest';
import { InMemoryLruCache } from './in_memory_lru_cache';
import { wait } from '../../tests/testUtils';

describe('InMemoryLruCache', () => {
  it('should save and get values correctly', () => {
    const cache = new InMemoryLruCache<number>(2);
    cache.save('a', 1);
    cache.save('b', 2);
    expect(cache.lookup('a')).toBe(1);
    expect(cache.lookup('b')).toBe(2);
  });

  it('should return undefined for non-existent keys', () => {
    const cache = new InMemoryLruCache<number>(2);
    expect(cache.lookup('a')).toBe(undefined);
  });

  it('should return all keys in cache when getKeys is called', () => {
    const cache = new InMemoryLruCache<number>(20);
    cache.save('a', 1);
    cache.save('b', 2);
    cache.save('c', 3);
    cache.save('d', 4);
    expect(cache.getKeys()).toEqual(expect.arrayContaining(['d', 'c', 'b', 'a']));
  });
  it('should evict least recently used keys when full', () => {
    const cache = new InMemoryLruCache<number>(3);
    cache.save('a', 1);
    cache.save('b', 2);
    cache.save('c', 3);

    expect(cache.lookup('b')).toBe(2);
    expect(cache.lookup('c')).toBe(3);
    expect(cache.lookup('a')).toBe(1);
    expect(cache.getKeys()).toEqual(expect.arrayContaining(['a', 'c', 'b']));

    // key use order is now a c b. next insert should evict b
    cache.save('d', 4);
    expect(cache.lookup('b')).toBe(undefined);
    expect(cache.getKeys()).toEqual(expect.arrayContaining(['d', 'a', 'c']));

    // key use order is now d a c. setting c should put it at the front
    cache.save('c', 5);

    // key use order is now c d a. next insert should evict a
    cache.save('e', 6);
    expect(cache.lookup('a')).toBe(undefined);
    expect(cache.getKeys()).toEqual(expect.arrayContaining(['e', 'c', 'd']));

    // key use order is now e c d. reading d should put it at the front
    expect(cache.lookup('d')).toBe(4);

    // key use order is now d e c. next insert should evict c
    cache.save('f', 7);
    expect(cache.lookup('c')).toBe(undefined);
    expect(cache.getKeys()).toEqual(expect.arrayContaining(['f', 'd', 'e']));
  });

  it('should not return expired values when get is called', async () => {
    const cache = new InMemoryLruCache<number>(2, 100);
    cache.save('a', 1);
    cache.save('b', 2);
    expect(cache.lookup('a')).toBe(1);
    expect(cache.lookup('b')).toBe(2);

    await wait(150);
    expect(cache.lookup('a')).toBe(undefined);
    expect(cache.lookup('b')).toBe(undefined);
  });

  it('should remove values correctly', () => {
    const cache = new InMemoryLruCache<number>(2);
    cache.save('a', 1);
    cache.save('b', 2);
    cache.save('c', 3);
    cache.remove('a');
    expect(cache.lookup('a')).toBe(undefined);
    expect(cache.lookup('b')).toBe(2);
    expect(cache.lookup('c')).toBe(3);
  });

  it('should clear all values correctly', () => {
    const cache = new InMemoryLruCache<number>(2);
    cache.save('a', 1);
    cache.save('b', 2);
    cache.reset();
    expect(cache.lookup('a')).toBe(undefined);
    expect(cache.lookup('b')).toBe(undefined);
  });
});
