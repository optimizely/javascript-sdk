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
import { vi, describe, it, expect } from 'vitest';
import { getMockAsyncCache } from '../tests/mock/mock_cache';
import { EventWithId } from './batch_event_processor';
import { EventStore, StoredEvent } from './event_store';
import { createImpressionEvent } from '../tests/mock/create_event';

import { DEFAULT_MAX_EVENTS_IN_STORE } from './event_store';
import { exhaustMicrotasks } from '../tests/testUtils';
import { EVENT_STORE_FULL } from 'error_message';
import { OptimizelyError } from '../error/optimizly_error';

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

  it('should return all keys from getKeys', async () => {
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

  it('should limit the number of saved keys when set is called concurrently', async () => {
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

  it('should limit the number of saved keys when set is called serially', async () => {
    const { store } = getEventStore({ maxSize: 2 });

    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    }

    await expect(store.set('event-1', event)).resolves.not.toThrow();
    await expect(store.set('event-2', event)).resolves.not.toThrow();
    await expect(store.set('event-3', event)).rejects.toThrow(new OptimizelyError(EVENT_STORE_FULL, event.event.uuid));

    const savedKeys = await store.getKeys();
    savedKeys.sort();

    expect(savedKeys).toEqual(['event-1', 'event-2']);
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

  it('should resave events without time information on get', async () => {
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

      // Simulate old stored event without time info
      const eventWithoutTime: StoredEvent = {
        id: value.id,
        event: value.event,
      };
      return originalSet(key, eventWithoutTime);
    });

    await store.set('test', event);

    const savedEvent = await store.get('test');
    expect(savedEvent).toEqual(expect.objectContaining(event));


    await exhaustMicrotasks();
    expect(setSpy).toHaveBeenCalledTimes(2);

    const secondCall = setSpy.mock.calls[1];

    expect(secondCall[1]._time).toBeDefined();
    expect(secondCall[1]._time?.storedAt).toBeLessThanOrEqual(Date.now());
    expect(secondCall[1]._time?.storedAt).toBeGreaterThanOrEqual(Date.now() - 10);
    expect(secondCall[1]._time?.ttl).toBe(ttl);
  });

  it('should store event when key expires after store being full', async () => {
    const ttl = 100;
    const { store } = getEventStore({ ttl, maxSize: 2 });

    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    }

    await store.set('event-1', event);
    await store.set('event-2', event);
    await expect(store.set('event-3', event)).rejects.toThrow();

    expect(await store.getKeys().then(keys => keys.sort())).toEqual(['event-1', 'event-2']);

    // wait for ttl to expire
    await new Promise(resolve => setTimeout(resolve, ttl + 50));

    // both events should be expired now
    expect(await store.get('event-1')).toBeUndefined();
    expect(await store.get('event-2')).toBeUndefined();

    await exhaustMicrotasks();

    // should be able to add new events now
    await expect(store.set('event-3', event)).resolves.not.toThrow();
    await expect(store.set('event-4', event)).resolves.not.toThrow();

    const savedEvent3 = await store.get('event-3');
    expect(savedEvent3).toEqual(expect.objectContaining(event));
    const savedEvent4 = await store.get('event-4');
    expect(savedEvent4).toEqual(expect.objectContaining(event));
  });

  it('should return all requested events correctly from getBatched', async () => {
    const { store } = getEventStore();
    const event1: EventWithId = { id: '1', event: createImpressionEvent('test-1') };
    const event2: EventWithId = { id: '2', event: createImpressionEvent('test-2') };
    const event3: EventWithId = { id: '3', event: createImpressionEvent('test-3') };

    await store.set('key-1', event1);
    await store.set('key-2', event2);
    await store.set('key-3', event3);

    const results = await store.getBatched(['key-3', 'key-1', 'key-2', 'key-4']);
    
    expect(results).toHaveLength(4);
    expect(results[0]).toEqual(expect.objectContaining(event3));
    expect(results[1]).toEqual(expect.objectContaining(event1));
    expect(results[2]).toEqual(expect.objectContaining(event2));
    expect(results[3]).toBeUndefined();
  });


  it('should handle expired events in getBatched', async () => {
    const ttl = 100;
    const { store } = getEventStore({ ttl });
    const event1: EventWithId = { id: '1', event: createImpressionEvent('test-1') };
    const event2: EventWithId = { id: '2', event: createImpressionEvent('test-2') };

    await store.set('key-1', event1);
    await new Promise(resolve => setTimeout(resolve, 70));
    await store.set('key-2', event2);

    // wait for first key to expire but not the second
    await new Promise(resolve => setTimeout(resolve, 50));

    const results = await store.getBatched(['key-1', 'key-2']);
    
    expect(results).toHaveLength(2);
    expect(results[0]).toBeUndefined();
    expect(results[1]).toEqual(expect.objectContaining(event2));

    await expect(store.getKeys()).resolves.toEqual(['key-2']);
  });

  it('should resave events without time information during getBatched', async () => {
    const ttl = 120_000;
    const { mockStore, store } = getEventStore({ ttl });
    const event: EventWithId = { id: '1', event: createImpressionEvent('test') };

    const originalSet = mockStore.set.bind(mockStore);

    let call = 0;
    const setSpy = vi.spyOn(mockStore, 'set').mockImplementation(async (key: string, value: StoredEvent) => {
      if (call++ > 0) {
        return originalSet(key, value);
      }

      // Simulate old stored event without time information
      const eventWithoutTime: StoredEvent = {
        id: value.id,
        event: value.event,
      };
      return originalSet(key, eventWithoutTime);
    });

    await store.set('key-1', event);
    await store.set('key-2', event);

    const results = await store.getBatched(['key-1', 'key-2']);
    
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(expect.objectContaining(event));
    expect(results[1]).toEqual(expect.objectContaining(event));

    await exhaustMicrotasks();
    expect(setSpy).toHaveBeenCalledTimes(3);

    const secondCall = setSpy.mock.calls[1];

    expect(secondCall[1]._time).toBeDefined();
    expect(secondCall[1]._time?.storedAt).toBeLessThanOrEqual(Date.now());
    expect(secondCall[1]._time?.storedAt).toBeGreaterThanOrEqual(Date.now() - 10);
    expect(secondCall[1]._time?.ttl).toBe(ttl);
  });

  it('should store event when keys expire during getBatched after store being full', async () => {
    const ttl = 100;
    const { store } = getEventStore({ ttl, maxSize: 2 });

    const event: EventWithId = {
      id: '1',
      event: createImpressionEvent('test'),
    }

    await store.set('event-1', event);
    await new Promise(resolve => setTimeout(resolve, 70));
    await store.set('event-2', event);
    await expect(store.set('event-3', event)).rejects.toThrow();

    expect(await store.getKeys().then(keys => keys.sort())).toEqual(['event-1', 'event-2']);

    // wait for the first event to expire
    await new Promise(resolve => setTimeout(resolve, 50));

    const results = await store.getBatched(['event-1', 'event-2']);
    
    expect(results).toHaveLength(2);
    expect(results[0]).toBeUndefined();
    expect(results[1]).toEqual(expect.objectContaining(event));
    
    await exhaustMicrotasks();

    // should be able to add new event now
    await expect(store.set('event-3', event)).resolves.not.toThrow();
    const savedEvent = await store.get('event-3');
    expect(savedEvent).toEqual(expect.objectContaining(event));
    expect(await store.getKeys().then(keys => keys.sort())).toEqual(['event-2', 'event-3']);
  });

  it('should restore in-memory key consistency after getKeys is called', async () => {
    const { mockStore, store } = getEventStore({ maxSize: 2 });
    const event: EventWithId = { id: '1', event: createImpressionEvent('test') };

    const originalSet = mockStore.set.bind(mockStore);
    
    let call = 0;
    vi.spyOn(mockStore, 'set').mockImplementation(async (key: string, value: StoredEvent) => {
      // only the seconde set call should fail
      if (call++ != 1) return originalSet(key, value);
      return Promise.reject(new Error('Simulated set failure'));
    });

    await expect(store.set('key-1', event)).resolves.not.toThrow();
    // this should fail, but in memory key list will become full
    await expect(store.set('key-2', event)).rejects.toThrow('Simulated set failure');
    await expect(store.set('key-3', event)).rejects.toThrow(new OptimizelyError(EVENT_STORE_FULL, event.event.uuid));
    

    let keys = await store.getKeys();
    expect(keys.sort()).toEqual(['key-1']);
    
    await expect(store.set('key-3', event)).resolves.not.toThrow();
    
    keys = await store.getKeys();
    expect(keys.sort()).toEqual(['key-1', 'key-3']);
  });
});
