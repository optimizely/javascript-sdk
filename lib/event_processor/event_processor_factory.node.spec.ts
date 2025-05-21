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
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./default_dispatcher.node', () => {
  return { default: {} };
});

vi.mock('./event_processor_factory', async (importOriginal) => {
  const getBatchEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
  const getOpaqueBatchEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
    const getForwardingEventProcessor = vi.fn().mockReturnValue({});
  const original: any = await importOriginal();
  return { ...original, getBatchEventProcessor, getOpaqueBatchEventProcessor, getForwardingEventProcessor };
});

vi.mock('../utils/cache/async_storage_cache.react_native', () => {
  return { AsyncStorageCache: vi.fn() };
});

vi.mock('../utils/cache/store', () => {
  return { SyncPrefixStore: vi.fn(), AsyncPrefixStore: vi.fn() };
});

import { createBatchEventProcessor, createForwardingEventProcessor } from './event_processor_factory.node';
import nodeDefaultEventDispatcher from './event_dispatcher/default_dispatcher.node';
import { EVENT_STORE_PREFIX, extractEventProcessor, getForwardingEventProcessor, FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';
import { getOpaqueBatchEventProcessor } from './event_processor_factory';
import { AsyncStore, AsyncPrefixStore, SyncStore, SyncPrefixStore } from '../utils/cache/store';
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

    const processor = extractEventProcessor(createForwardingEventProcessor(eventDispatcher));

    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, eventDispatcher);
  });

  it('uses the node default event dispatcher if none is provided', () => {
    const processor = extractEventProcessor(createForwardingEventProcessor());
    
    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, nodeDefaultEventDispatcher);
  });
});

describe('createBatchEventProcessor', () => {
  const mockGetOpaqueBatchEventProcessor = vi.mocked(getOpaqueBatchEventProcessor);
  const MockAsyncStorageCache = vi.mocked(AsyncStorageCache);
  const MockSyncPrefixStore = vi.mocked(SyncPrefixStore);
  const MockAsyncPrefixStore = vi.mocked(AsyncPrefixStore);

  beforeEach(() => {
    mockGetOpaqueBatchEventProcessor.mockClear();
    MockAsyncStorageCache.mockClear();
    MockSyncPrefixStore.mockClear();
    MockAsyncPrefixStore.mockClear();
  });

  it('uses no default event store if no eventStore is provided', () => {
    const processor = createBatchEventProcessor({});

    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    const eventStore = mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventStore;
    expect(eventStore).toBe(undefined);
  });

  it('wraps the provided eventStore in a SyncPrefixStore if a SyncCache is provided as eventStore', () => {
    const eventStore = {
      operation: 'sync',
    } as SyncStore<string>;

    const processor = createBatchEventProcessor({ eventStore });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventStore).toBe(MockSyncPrefixStore.mock.results[0].value);
    const [cache, prefix, transformGet, transformSet] = MockSyncPrefixStore.mock.calls[0];

    expect(cache).toBe(eventStore);
    expect(prefix).toBe(EVENT_STORE_PREFIX);

    // transformGet and transformSet should be JSON.parse and JSON.stringify
    expect(transformGet('{"value": 1}')).toEqual({ value: 1 });
    expect(transformSet({ value: 1 })).toBe('{"value":1}');
  });

  it('wraps the provided eventStore in a AsyncPrefixStore if a AsyncCache is provided as eventStore', () => {
    const eventStore = {
      operation: 'async',
    } as AsyncStore<string>;

    const processor = createBatchEventProcessor({ eventStore });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventStore).toBe(MockAsyncPrefixStore.mock.results[0].value);
    const [cache, prefix, transformGet, transformSet] = MockAsyncPrefixStore.mock.calls[0];

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
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(eventDispatcher);
  });

  it('uses the default node event dispatcher if none is provided', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(nodeDefaultEventDispatcher);
  });

  it('uses the provided closingEventDispatcher', () => {
    const closingEventDispatcher = {
      dispatchEvent: vi.fn(),
    };

    const processor = createBatchEventProcessor({ closingEventDispatcher });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(closingEventDispatcher);

    const processor2 = createBatchEventProcessor({ });
    expect(Object.is(processor2, mockGetOpaqueBatchEventProcessor.mock.results[1].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[1][0].closingEventDispatcher).toBe(undefined);
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

  it('uses maxRetries value of 5', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].retryOptions?.maxRetries).toBe(5);
  });

  it('uses no failed event retry if an eventStore is not provided', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].failedEventRetryInterval).toBe(undefined);
  });

  it('uses the default failedEventRetryInterval if an eventStore is provided', () => {
    const processor = createBatchEventProcessor({ eventStore: {} as any });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].failedEventRetryInterval).toBe(FAILED_EVENT_RETRY_INTERVAL);
  });
});
