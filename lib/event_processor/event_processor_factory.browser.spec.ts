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
import { beforeEach, describe, expect, it, vi } from 'vitest';


vi.mock('./default_dispatcher.browser', () => {
  return { default: {} };
});

// vitest does not handle Class mock well when transpiling to ES6 with { spy: true }.
// So we provide manual mocks here.
// Also importOriginal() does not work in browser mode, so we mock every export explicitly.
vi.mock('./event_processor_factory', () => {
  // Create a unique symbol for wrapping/unwrapping
  const eventProcessorSymbol = Symbol('eventProcessor');

  const getBatchEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
  const getOpaqueBatchEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
  const getForwardingEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });

  return {
    INVALID_EVENT_DISPATCHER: 'Invalid event dispatcher',
    FAILED_EVENT_RETRY_INTERVAL: 20000,
    getPrefixEventStore: vi.fn(),
    validateEventDispatcher: vi.fn(),
    getBatchEventProcessor,
    wrapEventProcessor: vi.fn((ep) => ({ [eventProcessorSymbol]: ep })),
    getOpaqueBatchEventProcessor,
    extractEventProcessor: vi.fn((ep) => ep?.[eventProcessorSymbol]),
    getForwardingEventProcessor,
    __platforms: ['__universal__'],
  };
});

vi.mock('../utils/cache/local_storage_cache.browser', () => {
  return { LocalStorageCache: vi.fn() };
});

vi.mock('./event_store', () => {
  return {
    DEFAULT_MAX_EVENTS_IN_STORE: 500,
    DEFAULT_STORE_TTL: 10 * 24 * 60 * 60 * 1000,
    EVENT_STORE_PREFIX: 'optly_event:',
    EventStore: vi.fn(),
    __platforms: ['__universal__'],
  };
});

vi.mock('../utils/cache/store', () => {
  // Create base abstract classes
  class SyncStoreWithBatchedGet {
    operation = 'sync' as const;
  }

  class AsyncStoreWithBatchedGet {
    operation = 'async' as const;
  }

  return {
    SyncStoreWithBatchedGet,
    AsyncStoreWithBatchedGet,
    getBatchedSync: vi.fn(),
    getBatchedAsync: vi.fn(),
    SyncPrefixStore: vi.fn(),
    AsyncPrefixStore: vi.fn(),
    __platforms: ['__universal__'],
  };
});


import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { SyncPrefixStore } from '../utils/cache/store';
import { default as browserDefaultEventDispatcher, default as defaultEventDispatcher } from './event_dispatcher/default_dispatcher.browser';
import sendBeaconEventDispatcher from './event_dispatcher/send_beacon_dispatcher.browser';
import { extractEventProcessor, FAILED_EVENT_RETRY_INTERVAL, getForwardingEventProcessor, getOpaqueBatchEventProcessor } from './event_processor_factory';
import { createBatchEventProcessor, createForwardingEventProcessor } from './event_processor_factory.browser';
import { EventStore } from './event_store';

describe('createForwardingEventProcessor', () => {
  const mockGetForwardingEventProcessor = vi.mocked(getForwardingEventProcessor);

  beforeEach(() => {
    mockGetForwardingEventProcessor.mockClear();
  });
    
  it('returns forwarding event processor by calling getForwardingEventProcessor with the provided dispatcher', () => {
    const eventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = extractEventProcessor(createForwardingEventProcessor(eventDispatcher));
    
    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, eventDispatcher);
  });

  it('uses the browser default event dispatcher if none is provided', () => {
    const processor = extractEventProcessor(createForwardingEventProcessor());

    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, browserDefaultEventDispatcher);
  });
});

describe('createBatchEventProcessor', () => {
  const mockGetOpaqueBatchEventProcessor = vi.mocked(getOpaqueBatchEventProcessor);
  const MockLocalStorageCache = vi.mocked(LocalStorageCache);
  const MockSyncPrefixStore = vi.mocked(SyncPrefixStore);
  const MockEventStore = vi.mocked(EventStore);

  beforeEach(() => {
    mockGetOpaqueBatchEventProcessor.mockClear();
    MockLocalStorageCache.mockClear();
    MockSyncPrefixStore.mockClear();
    MockEventStore.mockClear();
  });

  it('uses an EventStore instance with AsyncStorageCache and correct options if no eventStore is provided', () => {
    const processor = createBatchEventProcessor({
      storeTtl: 60_000,
    });

    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    const eventStore = mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventStore;
    expect(Object.is(eventStore, MockEventStore.mock.instances[0])).toBe(true);

    let { store, ttl, maxSize } = MockEventStore.mock.calls[0][0];
    expect(Object.is(store, MockLocalStorageCache.mock.instances[0])).toBe(true);

    expect(ttl).toBe(60_000);
    expect(maxSize).toBe(500); // the default max size * 2 < 500

    const processor2 = createBatchEventProcessor({
      storeTtl: 10_000,
      batchSize: 260,
    });

    expect(Object.is(processor2, mockGetOpaqueBatchEventProcessor.mock.results[1].value)).toBe(true);
    const eventStore2 = mockGetOpaqueBatchEventProcessor.mock.calls[1][0].eventStore;
    expect(Object.is(eventStore2, MockEventStore.mock.instances[1])).toBe(true);

    ({ store, ttl, maxSize } = MockEventStore.mock.calls[1][0]);
    expect(Object.is(store, MockLocalStorageCache.mock.instances[1])).toBe(true);

    expect(ttl).toBe(10_000);
    expect(maxSize).toBe(520); // the provided batch size * 2 > 500
  });

  it('uses the provided eventDispatcher', () => {
    const eventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createBatchEventProcessor({ eventDispatcher });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(eventDispatcher);
  });

  it('uses the default browser event dispatcher if none is provided', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(defaultEventDispatcher);
  });

  it('uses the provided closingEventDispatcher', () => {
    const closingEventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createBatchEventProcessor({ closingEventDispatcher });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(closingEventDispatcher);
  });

  it('does not use any closingEventDispatcher if eventDispatcher is provided but closingEventDispatcher is not', () => {
    const eventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createBatchEventProcessor({ eventDispatcher });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(undefined);
  });

  it('uses the default sendBeacon event dispatcher if neither eventDispatcher nor closingEventDispatcher is provided', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(sendBeaconEventDispatcher);
  });

  it('uses the provided flushInterval', () => {
    const processor1 = createBatchEventProcessor({ flushInterval: 2000 });
    expect(Object.is(processor1, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].flushInterval).toBe(2000);

    const processor2 = createBatchEventProcessor({ });
    expect(Object.is(processor2, mockGetOpaqueBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[1][0].flushInterval).toBe(undefined);
  });

  it('uses the provided batchSize', () => {
    const processor1 = createBatchEventProcessor({ batchSize: 20 });
    expect(Object.is(processor1, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].batchSize).toBe(20);

    const processor2 = createBatchEventProcessor({ });
    expect(Object.is(processor2, mockGetOpaqueBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[1][0].batchSize).toBe(undefined);
  });

  it('uses maxRetries value of 5 by default', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].retryOptions?.maxRetries).toBe(5);
  });

  it('uses the provided maxRetries value', () => {
    const processor1 = createBatchEventProcessor({ maxRetries: 3 });
    expect(Object.is(processor1, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].retryOptions?.maxRetries).toBe(3);

    const processor2 = createBatchEventProcessor({ maxRetries: 10 });
    expect(Object.is(processor2, mockGetOpaqueBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[1][0].retryOptions?.maxRetries).toBe(10);
  });

  it('uses the default failedEventRetryInterval', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].failedEventRetryInterval).toBe(FAILED_EVENT_RETRY_INTERVAL);
  });
});
