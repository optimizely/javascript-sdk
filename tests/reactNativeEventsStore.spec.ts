/**
 * Copyright 2022, Optimizely
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
/// <reference types="jest" />

const mockMap = new Map();

const mockGet = jest.fn().mockImplementation((key) => {
  return Promise.resolve(mockMap.get(key));
});

const mockSet = jest.fn().mockImplementation((key, value) => {
  mockMap.set(key, value);
  return Promise.resolve();
});

const mockRemove = jest.fn().mockImplementation((key) => {
  if (mockMap.has(key)) {
    mockMap.delete(key);
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
});

const mockContains = jest.fn().mockImplementation((key) => {
  return Promise.resolve(mockMap.has(key));
});


jest.mock('../lib/plugins/key_value_cache/reactNativeAsyncStorageCache', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: mockGet,
      contains: mockContains,
      set: mockSet,
      remove: mockRemove,
    }
  });
});

import ReactNativeAsyncStorageCache from '../lib/plugins/key_value_cache/reactNativeAsyncStorageCache';

import { ReactNativeEventsStore } from '../lib/modules/event_processor/reactNativeEventsStore'
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache'

const STORE_KEY = 'test-store'

describe('ReactNativeEventsStore', () => {
  const MockedReactNativeAsyncStorageCache = jest.mocked(ReactNativeAsyncStorageCache);
  let store: ReactNativeEventsStore<any>
  
  beforeEach(() => {
    MockedReactNativeAsyncStorageCache.mockClear();
    mockGet.mockClear();
    mockContains.mockClear();
    mockSet.mockClear();
    mockRemove.mockClear();
    mockMap.clear();
    store = new ReactNativeEventsStore(5, STORE_KEY)
  })

  describe('constructor', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('uses the user provided cache', () => {
      const cache = {
        get: jest.fn(),
        contains: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
      } as jest.Mocked<PersistentKeyValueCache>

      const store = new ReactNativeEventsStore(5, STORE_KEY, cache);
      store.clear();
      expect(cache.remove).toHaveBeenCalled();
    });

    it('uses ReactNativeAsyncStorageCache if no cache is provided', () => {
      const store = new ReactNativeEventsStore(5, STORE_KEY);
      store.clear();
      expect(MockedReactNativeAsyncStorageCache).toHaveBeenCalledTimes(1);
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('should store all the events correctly in the store', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})    
      const storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
    })
  
    it('should store all the events when set asynchronously', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      const storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
    })
  })

  describe('get', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('should correctly get items', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      expect(await store.get('event1')).toEqual({'name': 'event1'})
      expect(await store.get('event2')).toEqual({'name': 'event2'})
      expect(await store.get('event3')).toEqual({'name': 'event3'})
      expect(await store.get('event4')).toEqual({'name': 'event4'})
    })
  })

  describe('getEventsMap', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('should get the whole map correctly', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      const mapResult = await store.getEventsMap()
      expect(mapResult).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
    })
  })

  describe('getEventsList', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('should get all the events as a list', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      const listResult = await store.getEventsList()
      expect(listResult).toEqual([
        { "name": "event1" },
        { "name": "event2" },
        { "name": "event3" },
        { "name": "event4" },
      ])
    })
  })

  describe('remove', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('should correctly remove items from the store', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      let storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })

      await store.remove('event1')
      storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })

      await store.remove('event2')
      storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({      
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
    })

    it('should correctly remove items from the store when removed asynchronously', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      let storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })

      const promises = []
      await store.remove('event1')
      await store.remove('event2')
      await store.remove('event3')
      storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({ "event4": { "name": "event4" }})
    })
  })

  describe('clear', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('should clear the whole store',async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})
      let storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
      await store.clear()
      storedPendingEvents = storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY) || '{}');
      expect(storedPendingEvents).toEqual({})
    })
  })

  describe('maxSize', () => {
    beforeEach(() => {
      MockedReactNativeAsyncStorageCache.mockClear();
      mockGet.mockClear();
      mockContains.mockClear();
      mockSet.mockClear();
      mockRemove.mockClear();
      mockMap.clear();
    });

    it('should not add anymore events if the store if full', async () => {
      await store.set('event1', {'name': 'event1'})
      await store.set('event2', {'name': 'event2'})
      await store.set('event3', {'name': 'event3'})
      await store.set('event4', {'name': 'event4'})

      let storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
      })
      await store.set('event5', {'name': 'event5'})

      storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
        "event5": { "name": "event5" },
      })

      await store.set('event6', {'name': 'event6'})
      storedPendingEvents = JSON.parse(mockMap.get(STORE_KEY));
      expect(storedPendingEvents).toEqual({
        "event1": { "name": "event1" },
        "event2": { "name": "event2" },
        "event3": { "name": "event3" },
        "event4": { "name": "event4" },
        "event5": { "name": "event5" },
      })
    })
  })
})
