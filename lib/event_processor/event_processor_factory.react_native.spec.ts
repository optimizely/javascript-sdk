/**
 * Copyright 2024, Optimizely
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

vi.mock('./default_dispatcher.browser', () => {
  return { default: {} };
});

vi.mock('./forwarding_event_processor', () => {
  const getForwardingEventProcessor = vi.fn().mockReturnValue({});
  return { getForwardingEventProcessor };
});

vi.mock('./event_processor_factory', async importOriginal => {
  const getBatchEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
  const original: any = await importOriginal();
  return { ...original, getBatchEventProcessor };
});

vi.mock('../utils/cache/async_storage_cache.react_native', () => {
  return { AsyncStorageCache: vi.fn() };
});

vi.mock('../utils/cache/cache', () => {
  return { SyncPrefixCache: vi.fn(), AsyncPrefixCache: vi.fn() };
});

vi.mock('@react-native-community/netinfo', () => {
  return { NetInfoState: {}, addEventListener: vi.fn() };
});

let isNetInfoAvailable = false;
let isAsyncStorageAvailable = true;

await vi.hoisted(async () => {
  await mockRequireNetInfo();
});

async function mockRequireNetInfo() {
  const { Module } = await import('module');
  const M: any = Module;

  M._load_original = M._load;
  M._load = (uri: string, parent: string) => {
    if (uri === '@react-native-community/netinfo') {
      if (isNetInfoAvailable) return {};
      throw new Error('Module not found: @react-native-community/netinfo');
    }
    if (uri === '@react-native-async-storage/async-storage') {
      if (isAsyncStorageAvailable) return {};
      throw new Error('Module not found: @react-native-async-storage/async-storage');
    }

    return M._load_original(uri, parent);
  };
}

import { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor_factory.react_native';
import { getForwardingEventProcessor } from './forwarding_event_processor';
import defaultEventDispatcher from './event_dispatcher/default_dispatcher.browser';
import { EVENT_STORE_PREFIX, FAILED_EVENT_RETRY_INTERVAL, getPrefixEventStore } from './event_processor_factory';
import { getBatchEventProcessor } from './event_processor_factory';
import { AsyncCache, AsyncPrefixCache, SyncCache, SyncPrefixCache } from '../utils/cache/cache';
import { AsyncStorageCache } from '../utils/cache/async_storage_cache.react_native';
import { ReactNativeNetInfoEventProcessor } from './batch_event_processor.react_native';
import { BatchEventProcessor } from './batch_event_processor';

describe('createForwardingEventProcessor', () => {
  const mockGetForwardingEventProcessor = vi.mocked(getForwardingEventProcessor);

  beforeEach(() => {
    mockGetForwardingEventProcessor.mockClear();
    isNetInfoAvailable = false;
  });

  it('returns forwarding event processor by calling getForwardingEventProcessor with the provided dispatcher', () => {
    const eventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createForwardingEventProcessor(eventDispatcher);

    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, eventDispatcher);
  });

  it('uses the browser default event dispatcher if none is provided', () => {
    const processor = createForwardingEventProcessor();

    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, defaultEventDispatcher);
  });
});

describe('createBatchEventProcessor', () => {
  const mockGetBatchEventProcessor = vi.mocked(getBatchEventProcessor);
  const MockAsyncStorageCache = vi.mocked(AsyncStorageCache);
  const MockSyncPrefixCache = vi.mocked(SyncPrefixCache);
  const MockAsyncPrefixCache = vi.mocked(AsyncPrefixCache);

  beforeEach(() => {
    isNetInfoAvailable = false;
    mockGetBatchEventProcessor.mockClear();
    MockAsyncStorageCache.mockClear();
    MockSyncPrefixCache.mockClear();
    MockAsyncPrefixCache.mockClear();
  });

  it('returns an instance of ReacNativeNetInfoEventProcessor if netinfo can be required', async () => {
    isNetInfoAvailable = true;
    const processor = createBatchEventProcessor({});
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][1]).toBe(ReactNativeNetInfoEventProcessor);
  });

  it('returns an instance of BatchEventProcessor if netinfo cannot be required', async () => {
    isNetInfoAvailable = false;
    const processor = createBatchEventProcessor({});
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][1]).toBe(BatchEventProcessor);
  });

  it('uses AsyncStorageCache and AsyncPrefixCache to create eventStore if no eventStore is provided', () => {
    const processor = createBatchEventProcessor({});

    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    const eventStore = mockGetBatchEventProcessor.mock.calls[0][0].eventStore;
    expect(Object.is(eventStore, MockAsyncPrefixCache.mock.results[0].value)).toBe(true);

    const [cache, prefix, transformGet, transformSet] = MockAsyncPrefixCache.mock.calls[0];
    expect(Object.is(cache, MockAsyncStorageCache.mock.results[0].value)).toBe(true);
    expect(prefix).toBe(EVENT_STORE_PREFIX);

    // transformGet and transformSet should be identity functions
    expect(transformGet('value')).toBe('value');
    expect(transformSet('value')).toBe('value');
  });

  it('should throw error if @react-native-async-storage/async-storage is not available', async () => {
    isAsyncStorageAvailable = false;
    const { getBatchEventProcessor } = await vi.importActual<typeof import('./event_processor_factory')>(
      './event_processor_factory'
    );
    const { AsyncStorageCache } = await vi.importActual<
      typeof import('../utils/cache/async_storage_cache.react_native')
    >('../utils/cache/async_storage_cache.react_native');

    mockGetBatchEventProcessor.mockImplementationOnce(() => {
      return getBatchEventProcessor(
        {
          eventDispatcher: defaultEventDispatcher,
          flushInterval: 1000,
          batchSize: 10,
          retryOptions: {
            maxRetries: 5,
          },
          failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
        },
        BatchEventProcessor
      );
    });

    MockAsyncStorageCache.mockImplementationOnce(() => {
      return new AsyncStorageCache();
    });

    expect(() => createBatchEventProcessor({})).toThrowError(
      'Module not found: @react-native-async-storage/async-storage'
    );

    isAsyncStorageAvailable = true;
  });

  it('should not throw error if eventStore is provided and @react-native-async-storage/async-storage is not available', async () => {
    isAsyncStorageAvailable = false;
    const eventStore = {
      operation: 'sync',
    } as SyncCache<string>;
    const { getBatchEventProcessor } = await vi.importActual<typeof import('./event_processor_factory')>(
      './event_processor_factory'
    );
    const { AsyncStorageCache } = await vi.importActual<
      typeof import('../utils/cache/async_storage_cache.react_native')
    >('../utils/cache/async_storage_cache.react_native');

    mockGetBatchEventProcessor.mockImplementationOnce(() => {
      return getBatchEventProcessor(
        {
          eventDispatcher: defaultEventDispatcher,
          flushInterval: 1000,
          batchSize: 10,
          eventStore: getPrefixEventStore(eventStore),
          retryOptions: {
            maxRetries: 5,
          },
          failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
        },
        BatchEventProcessor
      );
    });

    MockAsyncStorageCache.mockImplementationOnce(() => {
      return new AsyncStorageCache();
    });

    expect(() => createBatchEventProcessor({ eventStore })).not.toThrow();

    isAsyncStorageAvailable = true;
  });

  it('wraps the provided eventStore in a SyncPrefixCache if a SyncCache is provided as eventStore', () => {
    const eventStore = {
      operation: 'sync',
    } as SyncCache<string>;

    const processor = createBatchEventProcessor({ eventStore });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);

    expect(mockGetBatchEventProcessor.mock.calls[0][0].eventStore).toBe(MockSyncPrefixCache.mock.results[0].value);
    const [cache, prefix, transformGet, transformSet] = MockSyncPrefixCache.mock.calls[0];

    expect(cache).toBe(eventStore);
    expect(prefix).toBe(EVENT_STORE_PREFIX);

    // transformGet and transformSet should be JSON.parse and JSON.stringify
    expect(transformGet('{"value": 1}')).toEqual({ value: 1 });
    expect(transformSet({ value: 1 })).toBe('{"value":1}');
  });

  it('wraps the provided eventStore in a AsyncPrefixCache if a AsyncCache is provided as eventStore', () => {
    const eventStore = {
      operation: 'async',
    } as AsyncCache<string>;

    const processor = createBatchEventProcessor({ eventStore });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);

    expect(mockGetBatchEventProcessor.mock.calls[0][0].eventStore).toBe(MockAsyncPrefixCache.mock.results[0].value);
    const [cache, prefix, transformGet, transformSet] = MockAsyncPrefixCache.mock.calls[0];

    expect(cache).toBe(eventStore);
    expect(prefix).toBe(EVENT_STORE_PREFIX);

    // transformGet and transformSet should be JSON.parse and JSON.stringify
    expect(transformGet('{"value": 1}')).toEqual({ value: 1 });
    expect(transformSet({ value: 1 })).toBe('{"value":1}');
  });

  it('uses the provided eventDispatcher', () => {
    const eventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createBatchEventProcessor({ eventDispatcher });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(eventDispatcher);
  });

  it('uses the default browser event dispatcher if none is provided', () => {
    const processor = createBatchEventProcessor({});
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(defaultEventDispatcher);
  });

  it('uses the provided closingEventDispatcher', () => {
    const closingEventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createBatchEventProcessor({ closingEventDispatcher });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(closingEventDispatcher);

    const processor2 = createBatchEventProcessor({});
    expect(Object.is(processor2, mockGetBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[1][0].closingEventDispatcher).toBe(undefined);
  });

  it('uses the provided flushInterval', () => {
    const processor1 = createBatchEventProcessor({ flushInterval: 2000 });
    expect(Object.is(processor1, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].flushInterval).toBe(2000);

    const processor2 = createBatchEventProcessor({});
    expect(Object.is(processor2, mockGetBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[1][0].flushInterval).toBe(undefined);
  });

  it('uses the provided batchSize', () => {
    const processor1 = createBatchEventProcessor({ batchSize: 20 });
    expect(Object.is(processor1, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].batchSize).toBe(20);

    const processor2 = createBatchEventProcessor({});
    expect(Object.is(processor2, mockGetBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[1][0].batchSize).toBe(undefined);
  });

  it('uses maxRetries value of 5', () => {
    const processor = createBatchEventProcessor({});
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].retryOptions?.maxRetries).toBe(5);
  });

  it('uses the default failedEventRetryInterval', () => {
    const processor = createBatchEventProcessor({});
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].failedEventRetryInterval).toBe(FAILED_EVENT_RETRY_INTERVAL);
  });
});
