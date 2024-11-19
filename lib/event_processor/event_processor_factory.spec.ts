import { describe, it, expect, beforeEach, vi, MockInstance } from 'vitest';
import { DEFAULT_EVENT_BATCH_SIZE, DEFAULT_EVENT_FLUSH_INTERVAL, DEFAULT_MAX_BACKOFF, DEFAULT_MIN_BACKOFF, getBatchEventProcessor } from './event_processor_factory';
import { BatchEventProcessor, BatchEventProcessorConfig, EventWithId } from './batch_event_processor';
import { ExponentialBackoff, IntervalRepeater } from '../utils/repeater/repeater';
import { getMockSyncCache } from '../tests/mock/mock_cache';
import { LogLevel } from '../modules/logging';

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

  it('returns an instane of BatchEventProcessor if no subclass constructor is provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
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
    };

    const processor = getBatchEventProcessor(options, CustomEventProcessor);

    expect(processor instanceof CustomEventProcessor).toBe(true);
  });

  it('does not use retry if retryOptions is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
    };

    const processor = getBatchEventProcessor(options);
    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig).toBe(undefined);
  });

  it('uses retry when retryOptions is provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: {},
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const usedRetryConfig = MockBatchEventProcessor.mock.calls[0][0].retryConfig;
    expect(usedRetryConfig).not.toBe(undefined);
    expect(usedRetryConfig?.backoffProvider).not.toBe(undefined);
  });

  it('uses the correct maxRetries value when retryOptions is provided', () => {
    const options1 = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: {
        maxRetries: 10,
      },
    };

    const processor1 = getBatchEventProcessor(options1);
    expect(Object.is(processor1, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig?.maxRetries).toBe(10);

    const options2 = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: {},
    };

    const processor2 = getBatchEventProcessor(options2);
    expect(Object.is(processor2, MockBatchEventProcessor.mock.instances[1])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig).not.toBe(undefined);
    expect(MockBatchEventProcessor.mock.calls[1][0].retryConfig?.maxRetries).toBe(undefined);
  });

  it('uses exponential backoff with default parameters when retryOptions is provided without backoff values', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: {},
    };

    const processor = getBatchEventProcessor(options);
    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);

    const backoffProvider = MockBatchEventProcessor.mock.calls[0][0].retryConfig?.backoffProvider;
    expect(backoffProvider).not.toBe(undefined);
    const backoff = backoffProvider?.();
    expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
    expect(MockExponentialBackoff).toHaveBeenNthCalledWith(1, DEFAULT_MIN_BACKOFF, DEFAULT_MAX_BACKOFF, 500);
  });

  it('uses exponential backoff with provided backoff values in retryOptions', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: { minBackoff: 1000, maxBackoff: 2000 },
    };

    const processor = getBatchEventProcessor(options);
    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const backoffProvider = MockBatchEventProcessor.mock.calls[0][0].retryConfig?.backoffProvider;

    expect(backoffProvider).not.toBe(undefined);
    const backoff = backoffProvider?.();
    expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
    expect(MockExponentialBackoff).toHaveBeenNthCalledWith(1, 1000, 2000, 500);
  });

  it('uses a IntervalRepeater with default flush interval and adds a startup log if flushInterval is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const usedRepeater = MockBatchEventProcessor.mock.calls[0][0].dispatchRepeater;
    expect(Object.is(usedRepeater, MockIntervalRepeater.mock.instances[0])).toBe(true);
    expect(MockIntervalRepeater).toHaveBeenNthCalledWith(1, DEFAULT_EVENT_FLUSH_INTERVAL);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.WARNING,
      message: 'Invalid flushInterval %s, defaulting to %s',
      params: [undefined, DEFAULT_EVENT_FLUSH_INTERVAL],
    }]));
  });

  it('uses default flush interval and adds a startup log if flushInterval is less than 1', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      flushInterval: -1,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const usedRepeater = MockBatchEventProcessor.mock.calls[0][0].dispatchRepeater;
    expect(Object.is(usedRepeater, MockIntervalRepeater.mock.instances[0])).toBe(true);
    expect(MockIntervalRepeater).toHaveBeenNthCalledWith(1, DEFAULT_EVENT_FLUSH_INTERVAL);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.WARNING,
      message: 'Invalid flushInterval %s, defaulting to %s',
      params: [-1, DEFAULT_EVENT_FLUSH_INTERVAL],
    }]));
  });

  it('uses a IntervalRepeater with provided flushInterval and adds no startup log if provided flushInterval is valid', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      flushInterval: 12345,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    const usedRepeater = MockBatchEventProcessor.mock.calls[0][0].dispatchRepeater;
    expect(Object.is(usedRepeater, MockIntervalRepeater.mock.instances[0])).toBe(true);
    expect(MockIntervalRepeater).toHaveBeenNthCalledWith(1, 12345);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs?.find((log) => log.message === 'Invalid flushInterval %s, defaulting to %s')).toBe(undefined);
  });


  it('uses a IntervalRepeater with default flush interval and adds a startup log if flushInterval is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].batchSize).toBe(DEFAULT_EVENT_BATCH_SIZE);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.WARNING,
      message: 'Invalid batchSize %s, defaulting to %s',
      params: [undefined, DEFAULT_EVENT_BATCH_SIZE],
    }]));
  });

  it('uses default size and adds a startup log if provided batchSize is less than 1', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      batchSize: -1,
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].batchSize).toBe(DEFAULT_EVENT_BATCH_SIZE);

    const startupLogs = MockBatchEventProcessor.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.WARNING,
      message: 'Invalid batchSize %s, defaulting to %s',
      params: [-1, DEFAULT_EVENT_BATCH_SIZE],
    }]));
  });

  it('does not use a failedEventRepeater if failedEventRetryInterval is not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].failedEventRepeater).toBe(undefined);
  });

  it('uses a IntervalRepeater with provided failedEventRetryInterval as failedEventRepeater', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      failedEventRetryInterval: 12345,
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
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].eventDispatcher).toBe(eventDispatcher);
  });

  it('does not use any closingEventDispatcher if not provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
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
    };

    const processor = getBatchEventProcessor(options);

    expect(Object.is(processor, MockBatchEventProcessor.mock.instances[0])).toBe(true);
    expect(MockBatchEventProcessor.mock.calls[0][0].eventStore).toBe(eventStore);
  });
});
