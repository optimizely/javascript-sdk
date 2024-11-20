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

vi.mock('./default_dispatcher.node', () => {
  return { default: {} };
});

vi.mock('./forwarding_event_processor', () => {
  const getForwardingEventProcessor = vi.fn().mockReturnValue({});
  return { getForwardingEventProcessor };
});

vi.mock('./event_processor_factory', async (importOriginal) => {
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

import { createBatchEventProcessor, createForwardingEventProcessor } from './event_processor_factory.node';
import { getForwardingEventProcessor } from './forwarding_event_processor';
import nodeDefaultEventDispatcher from './default_dispatcher.node';
import { EVENT_STORE_PREFIX, FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';
import { getBatchEventProcessor } from './event_processor_factory';
import { AsyncCache, AsyncPrefixCache, SyncCache, SyncPrefixCache } from '../utils/cache/cache';
import { AsyncStorageCache } from '../utils/cache/async_storage_cache.react_native';

describe('createForwardingEventProcessor', () => {
  const mockGetForwardingEventProcessor = vi.mocked(getForwardingEventProcessor);

  beforeEach(() => {
    mockGetForwardingEventProcessor.mockClear();
  });
    
  it('returns forwarding event processor by calling getForwardingEventProcessor with the provided dispatcher', () => {
    const eventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createForwardingEventProcessor(eventDispatcher);

    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, eventDispatcher);
  });

  it('uses the node default event dispatcher if none is provided', () => {
    const processor = createForwardingEventProcessor();
    
    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, nodeDefaultEventDispatcher);
  });
});

describe('createBatchEventProcessor', () => {
  const mockGetBatchEventProcessor = vi.mocked(getBatchEventProcessor);
  const MockAsyncStorageCache = vi.mocked(AsyncStorageCache);
  const MockSyncPrefixCache = vi.mocked(SyncPrefixCache);
  const MockAsyncPrefixCache = vi.mocked(AsyncPrefixCache);

  beforeEach(() => {
    mockGetBatchEventProcessor.mockClear();
    MockAsyncStorageCache.mockClear();
    MockSyncPrefixCache.mockClear();
    MockAsyncPrefixCache.mockClear();
  });

  it('uses no default event store if no eventStore is provided', () => {
    const processor = createBatchEventProcessor({});

    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    const eventStore = mockGetBatchEventProcessor.mock.calls[0][0].eventStore;
    expect(eventStore).toBe(undefined);
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

  it('uses the default node event dispatcher if none is provided', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(nodeDefaultEventDispatcher);
  });

  it('uses the provided closingEventDispatcher', () => {
    const closingEventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createBatchEventProcessor({ closingEventDispatcher });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(closingEventDispatcher);

    const processor2 = createBatchEventProcessor({ });
    expect(Object.is(processor2, mockGetBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[1][0].closingEventDispatcher).toBe(undefined);
  });

  it('uses the provided flushInterval', () => {
    const processor1 = createBatchEventProcessor({ flushInterval: 2000 });
    expect(Object.is(processor1, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].flushInterval).toBe(2000);

    const processor2 = createBatchEventProcessor({ });
    expect(Object.is(processor2, mockGetBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[1][0].flushInterval).toBe(undefined);
  });

  it('uses the provided batchSize', () => {
    const processor1 = createBatchEventProcessor({ batchSize: 20 });
    expect(Object.is(processor1, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].batchSize).toBe(20);

    const processor2 = createBatchEventProcessor({ });
    expect(Object.is(processor2, mockGetBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[1][0].batchSize).toBe(undefined);
  });

  it('uses maxRetries value of 10', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].retryOptions?.maxRetries).toBe(10);
  });

  it('uses the default failedEventRetryInterval', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetBatchEventProcessor.mock.calls[0][0].failedEventRetryInterval).toBe(FAILED_EVENT_RETRY_INTERVAL);
  });
});
