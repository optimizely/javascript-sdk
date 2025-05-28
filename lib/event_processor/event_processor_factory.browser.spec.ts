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

vi.mock('./default_dispatcher.browser', () => {
  return { default: {} };
});

vi.mock('./event_processor_factory', async (importOriginal) => {
  const getBatchEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
  const getOpaqueBatchEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
  const getForwardingEventProcessor = vi.fn().mockImplementation(() => {
    return {};
  });
  const original: any = await importOriginal();
  return { ...original, getBatchEventProcessor, getOpaqueBatchEventProcessor, getForwardingEventProcessor };
});

vi.mock('../utils/cache/local_storage_cache.browser', () => {
  return { LocalStorageCache: vi.fn() };
});

vi.mock('../utils/cache/store', () => {
  return { SyncPrefixStore: vi.fn() };
});


import defaultEventDispatcher from './event_dispatcher/default_dispatcher.browser';
import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { SyncPrefixStore } from '../utils/cache/store';
import { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor_factory.browser';
import { EVENT_STORE_PREFIX, extractEventProcessor, getForwardingEventProcessor, FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';
import sendBeaconEventDispatcher from './event_dispatcher/send_beacon_dispatcher.browser';
import browserDefaultEventDispatcher from './event_dispatcher/default_dispatcher.browser';
import { getOpaqueBatchEventProcessor } from './event_processor_factory';

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

  beforeEach(() => {
    mockGetOpaqueBatchEventProcessor.mockClear();
    MockLocalStorageCache.mockClear();
    MockSyncPrefixStore.mockClear();
  });

  it('uses LocalStorageCache and SyncPrefixStore to create eventStore', () => {
    const processor = createBatchEventProcessor({});
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    const eventStore = mockGetOpaqueBatchEventProcessor.mock.calls[0][0].eventStore;
    expect(Object.is(eventStore, MockSyncPrefixStore.mock.results[0].value)).toBe(true);

    const [cache, prefix, transformGet, transformSet] = MockSyncPrefixStore.mock.calls[0];
    expect(Object.is(cache, MockLocalStorageCache.mock.results[0].value)).toBe(true);
    expect(prefix).toBe(EVENT_STORE_PREFIX);

    // transformGet and transformSet should be identity functions
    expect(transformGet('value')).toBe('value');
    expect(transformSet('value')).toBe('value');
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

  it('uses maxRetries value of 5', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].retryOptions?.maxRetries).toBe(5);
  });

  it('uses the default failedEventRetryInterval', () => {
    const processor = createBatchEventProcessor({ });
    expect(Object.is(processor, mockGetOpaqueBatchEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetOpaqueBatchEventProcessor.mock.calls[0][0].failedEventRetryInterval).toBe(FAILED_EVENT_RETRY_INTERVAL);
  });
});
