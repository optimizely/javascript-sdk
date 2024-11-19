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

vi.mock('./event_processor_factory', () => {
  const getBatchEventProcessor = vi.fn().mockReturnValue({});
  return { getBatchEventProcessor };
});

import { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor_factory.browser';
import { getForwardingEventProcessor } from './forwarding_event_processor';
import browserDefaultEventDispatcher from './default_dispatcher.browser';
import { getBatchEventProcessor } from './event_processor_factory';

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

  it('uses the browser default event dispatcher if none is provided', () => {
    const processor = createForwardingEventProcessor();

    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, browserDefaultEventDispatcher);
  });
});


describe('createBatchEventProcessor', () => {
  const mockGetBatchEventProcessor = vi.mocked(getBatchEventProcessor);

  beforeEach(() => {
    mockGetBatchEventProcessor.mockClear();
  });

  it('uses localStorageCache and SyncPrefixCache to create eventStore', () => {
    const options = {
      eventDispatcher: {
        dispatchEvent: vi.fn(),
      },
      flushInterval: 1000,
      batchSize: 10,
    };

    const processor = createBatchEventProcessor(options);
    expect(Object.is(processor, mockGetBatchEventProcessor.mock.results[0].value)).toBe(true);
    const eventStore = mockGetBatchEventProcessor.mock.calls[0][0].eventStore;
    expect
  });
});
