/**
 * Copyright 2025, Optimizely
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
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getMockAsyncCache, getMockSyncCache } from '../tests/mock/mock_cache';
import { SyncStore } from '../utils/cache/store';
import { EventWithId } from './batch_event_processor';
import { EventStore, StoredEvent } from './event_store';
import { createImpressionEvent } from '../tests/mock/create_event';

import { DEFAULT_MAX_EVENTS_IN_STORE } from './event_store';
import { exhaustMicrotasks } from '../tests/testUtils';

type TestStoreConfig = {
  maxSize?: number;
  ttl?: number;
}

const getEventStore = (config: TestStoreConfig = {}) => {
  const mockStore = getMockAsyncCache<StoredEvent>();
  const store = new EventStore({...config, store: mockStore });
  return { mockStore, store }
}

describe('EventStore', () => {
  it('should be able to get the stored event correctly', async () => {
    const { store } = getEventStore();
    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    }

    await store.set('test', event);
    const savedEvent = await store.get('test');
    expect(savedEvent).toEqual(expect.objectContaining(event));
  });

  it('should remove a key correctly', async () => {
    const { store } = getEventStore();
    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    }

    await store.set('test-1', event);
    let saved1 = await store.get('test-1');
    expect(saved1).toEqual(expect.objectContaining(event));

    await store.set('test-2', event);

    await store.remove('test-1');
    saved1 = await store.get('test-1');
    expect(saved1).toBeUndefined()

    const saved2 = await store.get('test-2');
    expect(saved2).toEqual(expect.objectContaining(event));
  });

  it('should return all keys from getKeys()', async () => {
    const { store } = getEventStore();
    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    };

    const keys = [];

    for(let i = 0; i < 10; i++) {
      keys.push(`test-${i}`)
      await store.set(`test-${i}`, event);
    }

    const savedKeys = await store.getKeys();
    savedKeys.sort();

    expect(savedKeys).toEqual(keys);
  });

  it('should limit the number of saved keys', async () => {
    const { store } = getEventStore();

    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    } 

    const keys = [];
    const promises = [];

    for(let i = 0; i < DEFAULT_MAX_EVENTS_IN_STORE + 10; i++) {
      keys.push(i + '')
      const res = store.set(i + '', event);
      res.catch(() => {});
      promises.push(res);
    }

    for(let i = 0; i < DEFAULT_MAX_EVENTS_IN_STORE; i++) {
      await expect(promises[i]).resolves.not.toThrow();
    }

    for(let i = 0; i < 10; i++) {
      await expect(promises[DEFAULT_MAX_EVENTS_IN_STORE + i]).rejects.toThrow();
    }

    const savedKeys = await store.getKeys();
    savedKeys.sort((a, b) => Number(a) - Number(b));

    expect(savedKeys).toEqual(keys.slice(0, DEFAULT_MAX_EVENTS_IN_STORE));
  });

  it('should save keys again when the number of stored events drops below maxSize', async () => {
    const { store } = getEventStore();

    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    } 

    const keys = []
    for(let i = 0; i < DEFAULT_MAX_EVENTS_IN_STORE + 10; i++) {
      keys.push(i + '');
      await store.set(i + '', event).catch(() => {});
    }

    const savedKeys = await store.getKeys();
    savedKeys.sort((a, b) => Number(a) - Number(b));

    expect(savedKeys).toEqual(keys.slice(0, DEFAULT_MAX_EVENTS_IN_STORE));

    for(let i = 0; i < 10; i++) {
      const keyToRemove = i + '';
      await store.remove(keyToRemove);
    }

    for(let i = DEFAULT_MAX_EVENTS_IN_STORE; i < DEFAULT_MAX_EVENTS_IN_STORE + 10; i++) {
      const keyToAdd = i + '';
      await expect(store.set(keyToAdd, event)).resolves.not.toThrow();
    }

    const finalKeys = await store.getKeys();
    finalKeys.sort((a, b) => Number(a) - Number(b));

    const expectedKeys = [];
    for(let i = 10; i < DEFAULT_MAX_EVENTS_IN_STORE + 10; i++) {
      expectedKeys.push(i + '');
    }

    expect(finalKeys).toEqual(expectedKeys);
  });

  it('should expire events after ttl', async () => {
    const ttl = 100; // 100 ms
    const { store } = getEventStore({ ttl });

    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    }

    await store.set('test', event);
    const savedEvent = await store.get('test');
    expect(savedEvent).toEqual(expect.objectContaining(event));

    // wait for ttl to expire
    await new Promise(resolve => setTimeout(resolve, ttl + 50));

    const expiredEvent = await store.get('test');
    expect(expiredEvent).toBeUndefined();

    expect(await store.getKeys()).toEqual([]);
  });

  it('should resave events without expireAt on get', async () => {
    const ttl = 120_000;
    const { mockStore, store } = getEventStore({ ttl });

    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    }


    const originalSet = mockStore.set.bind(mockStore);

    let call = 0;
    const setSpy = vi.spyOn(mockStore, 'set').mockImplementation(async (key: string, value: StoredEvent) => {
      if (call++ > 0) {
        return originalSet(key, value);
      }

      // Simulate old stored event without expireAt
      const eventWithoutExpireAt: StoredEvent = {
        id: value.id,
        event: value.event,
      };
      return originalSet(key, eventWithoutExpireAt);
    });

    await store.set('test', event);

    const savedEvent = await store.get('test');
    expect(savedEvent).toEqual(expect.objectContaining(event));


    await exhaustMicrotasks();
    expect(setSpy).toHaveBeenCalledTimes(2);

    const secondCall = setSpy.mock.calls[1];

    expect(secondCall[1].expiresAt).toBeDefined();
    expect(secondCall[1].expiresAt!).toBeGreaterThanOrEqual(Date.now() + ttl - 10);
  });
});
