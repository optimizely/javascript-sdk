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

import { describe, it, expect, beforeEach, vi, MockInstance } from 'vitest';
import { getBatchEventProcessor } from './event_processor_factory';
import { BatchEventProcessor, BatchEventProcessorConfig, EventWithId,DEFAULT_MAX_BACKOFF, DEFAULT_MIN_BACKOFF } from './batch_event_processor';
import { ExponentialBackoff, IntervalRepeater } from '../utils/repeater/repeater';
import { getMockSyncCache } from '../tests/mock/mock_cache';
import { LogLevel } from '../logging/logger';

vi.mock('./batch_event_processor');
vi.mock('../utils/repeater/repeater');

const getMockEventDispatcher = () => {
  return {
    dispatchEvent: vi.fn(),
  }
};

describe('getBatchEventProcessor', () => {
  const MockBatchEventProcessor = vi.mocked(BatchEventProcessor);
  const MockExponentialBackoff = vi.mocked(ExponentialBackoff);
  const MockIntervalRepeater = vi.mocked(IntervalRepeater);
  
  beforeEach(() => {
    MockBatchEventProcessor.mockReset();
    MockExponentialBackoff.mockReset();
    MockIntervalRepeater.mockReset();
  });

  it('should throw an error if provided eventDispatcher is not valid', () => {
    expect(() => getBatchEventProcessor({
      eventDispatcher: undefined as any,
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
    })).toThrow('Invalid event dispatcher');

    expect(() => getBatchEventProcessor({
      eventDispatcher: null as any,
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
    })).toThrow('Invalid event dispatcher');

    expect(() => getBatchEventProcessor({
      eventDispatcher: 'abc' as any,
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
    })).toThrow('Invalid event dispatcher');

    expect(() => getBatchEventProcessor({
      eventDispatcher: {} as any,
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
    })).toThrow('Invalid event dispatcher');

    expect(() => getBatchEventProcessor({
      eventDispatcher: { dispatchEvent: 'abc' } as any,
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
    })).toThrow('Invalid event dispatcher');
  });

  it('should throw and error if provided event store is invalid', () => {
    expect(() => getBatchEventProcessor({
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
      eventStore: 'abc' as any,
    })).toThrow('Invalid store');

    expect(() => getBatchEventProcessor({
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
      eventStore: 123 as any,
    })).toThrow('Invalid store');

    expect(() => getBatchEventProcessor({
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
      eventStore: {} as any,
    })).toThrow('Invalid store method set, Invalid store method get, Invalid store method remove, Invalid store method getKeys');

    expect(() => getBatchEventProcessor({
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
      eventStore: { set: 'abc', get: 'abc', remove: 'abc', getKeys: 'abc' } as any,
    })).toThrow('Invalid store method set, Invalid store method get, Invalid store method remove, Invalid store method getKeys');

    const noop = () => {};

    expect(() => getBatchEventProcessor({
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
      eventStore: { set: noop, get: 'abc' } as any,
    })).toThrow('Invalid store method get, Invalid store method remove, Invalid store method getKeys');

    expect(() => getBatchEventProcessor({
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
      eventStore: { set: noop, get: noop, remove: 'abc' } as any,
    })).toThrow('Invalid store method remove, Invalid store method getKeys');

    expect(() => getBatchEventProcessor({
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 10000,
      defaultBatchSize: 10,
      eventStore: { set: noop, get: noop, remove: noop, getKeys: 'abc' } as any,
    })).toThrow('Invalid store method getKeys');
  });

  it('returns an instane of BatchEventProcessor if no subclass constructor is provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 1000,
      defaultBatchSize: 10,
    };

    const processor = getBatchEventProcessor(options);

    expect(processor instanceof BatchEventProcessor).toBe(true);
  });

  it('returns an instane of the provided subclass constructor', () => {
    class CustomEventProcessor extends BatchEventProcessor {
      constructor(opts: BatchEventProcessorConfig) {
        super(opts);
      }
    }

    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 1000,
      defaultBatchSize: 10,
    };

    const processor = getBatchEventProcessor(options, CustomEventProcessor);

    expect(processor instanceof CustomEventProcessor).toBe(true);
  });

  it('does not use retry if retryOptions is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 1000,
      defaultBatchSize: 10,
    };

    const processor = getBatchEventProcessor(options);
    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig).toBe(undefined);
  });

  it('uses the correct maxRetries value when retryOptions is provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 1000,
      defaultBatchSize: 10,
      retryOptions: {
        maxRetries: 10,
      },
    };

    const processor = getBatchEventProcessor(options);
    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig?.maxRetries).toBe(10);
  });

  it('uses exponential backoff with default parameters when retryOptions is provided without backoff values', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 1000,
      defaultBatchSize: 10,
      retryOptions: { maxRetries: 2 },
    };

    const processor = getBatchEventProcessor(options);
    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);

    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig?.maxRetries).toBe(2);

    const backoffProvider = MockBatchEventProcessor.mock.calls[0][0].retryConfig?.backoffProvider;
    expect(backoffProvider).not.toBe(undefined);
    const backoff = backoffProvider?.();
    expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
    expect(MockExponentialBackoff).toHaveBeenNthCalledWith(1, DEFAULT_MIN_BACKOFF, DEFAULT_MAX_BACKOFF, 500);
  });

  it('uses exponential backoff with provided backoff values in retryOptions', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 1000,
      defaultBatchSize: 10,
      retryOptions: { maxRetries: 2, minBackoff: 1000, maxBackoff: 2000 },
    };

    const processor = getBatchEventProcessor(options);
    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);

    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig?.maxRetries).toBe(2);
    
    const backoffProvider = MockBatchEventProcessor.mock.calls[0][0].retryConfig?.backoffProvider;

    expect(backoffProvider).not.toBe(undefined);
    const backoff = backoffProvider?.();
    expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
    expect(MockExponentialBackoff).toHaveBeenNthCalledWith(1, 1000, 2000, 500);
  });

  it('uses a IntervalRepeater with default flush interval and adds a startup log if flushInterval is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultFlushInterval: 12345,
      defaultBatchSize: 77,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const usedRepeater = MockBatchEventProcessor.mock.calls[0][0].dispatchRepeater;
    expect(Object.is(usedRepeater, MockIntervalRepeater.mock.instances[0])).toBe(true);
    expect(MockIntervalRepeater).toHaveBeenNthCalledWith(1, 12345);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.Warn,
      message: 'Invalid flushInterval %s, defaulting to %s',
      params: [undefined, 12345],
    }]));
  });

  it('uses default flush interval and adds a startup log if flushInterval is less than 1', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      flushInterval: -1,
      defaultFlushInterval: 12345,
      defaultBatchSize: 77,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const usedRepeater = MockBatchEventProcessor.mock.calls[0][0].dispatchRepeater;
    expect(Object.is(usedRepeater, MockIntervalRepeater.mock.instances[0])).toBe(true);
    expect(MockIntervalRepeater).toHaveBeenNthCalledWith(1, 12345);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.Warn,
      message: 'Invalid flushInterval %s, defaulting to %s',
      params: [-1, 12345],
    }]));
  });

  it('uses a IntervalRepeater with provided flushInterval and adds no startup log if provided flushInterval is valid', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      flushInterval: 12345,
      defaultFlushInterval: 1000,
      defaultBatchSize: 77,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const usedRepeater = MockBatchEventProcessor.mock.calls[0][0].dispatchRepeater;
    expect(Object.is(usedRepeater, MockIntervalRepeater.mock.instances[0])).toBe(true);
    expect(MockIntervalRepeater).toHaveBeenNthCalledWith(1, 12345);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs?.find((log) => log.message === 'Invalid flushInterval %s, defaulting to %s')).toBe(undefined);
  });


  it('uses default batch size and adds a startup log if batchSize is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].batchSize).toBe(77);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.Warn,
      message: 'Invalid batchSize %s, defaulting to %s',
      params: [undefined, 77],
    }]));
  });

  it('uses default size and adds a startup log if provided batchSize is less than 1', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      batchSize: -1,
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].batchSize).toBe(77);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.Warn,
      message: 'Invalid batchSize %s, defaulting to %s',
      params: [-1, 77],
    }]));
  });

  it('does not use a failedEventRepeater if failedEventRetryInterval is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].failedEventRepeater).toBe(undefined);
  });

  it('uses a IntervalRepeater with provided failedEventRetryInterval as failedEventRepeater', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      failedEventRetryInterval: 12345,
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(Object.is(MockBatchEventProcessor.mock.calls[0][0].failedEventRepeater, MockIntervalRepeater.mock.instances[1])).toBe(true);
    expect(MockIntervalRepeater).toHaveBeenNthCalledWith(2, 12345);
  });

  it('uses the provided eventDispatcher', () => {
    const eventDispatcher = getMockEventDispatcher();
    const options = {
      eventDispatcher,
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(eventDispatcher);
  });

  it('does not use any closingEventDispatcher if not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(undefined);
  });

  it('uses the provided closingEventDispatcher', () => {
    const closingEventDispatcher = getMockEventDispatcher();
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      closingEventDispatcher,
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].closingEventDispatcher).toBe(closingEventDispatcher);
  });

  it('uses the provided eventStore', () => {
    const eventStore = getMockSyncCache<EventWithId>();
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      eventStore,
      defaultBatchSize: 77,
      defaultFlushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].eventStore).toBe(eventStore);
  });
});
