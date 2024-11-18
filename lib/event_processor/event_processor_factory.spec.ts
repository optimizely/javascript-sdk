import { describe, it, expect, beforeEach, vi, MockInstance } from 'vitest';
import { DEFAULT_MAX_BACKOFF, DEFAULT_MIN_BACKOFF, getBatchEventProcessor } from './event_processor_factory';
import { BatchEventProcessor, BatchEventProcessorConfig } from './batch_event_processor';
import { ExponentialBackoff, IntervalRepeater } from '../utils/repeater/repeater';

vi.mock('./batch_event_processor');
vi.mock('../utils/repeater/repeater');

type BatchEventProcessorConstructor = typeof BatchEventProcessor;

const getMockEventDispatcher = () => {
  return {
    dispatchEvent: vi.fn(),
  }
};

describe('getBatchEventProcessor', () => {
  const MockBatchEventProcessor = vi.mocked(BatchEventProcessor);
  const MockExponentialBackoff = vi.mocked(ExponentialBackoff);
  
  beforeEach(() => {
    MockBatchEventProcessor.mockReset();
    MockExponentialBackoff.mockReset();
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
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig).toBe(undefined);
  });

  it('uses retry when retryOptions is provided', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: {},
    };

    let processor = getBatchEventProcessor(options);

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

    let processor1 = getBatchEventProcessor(options1);
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig?.maxRetries).toBe(10);

    const options2 = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: {},
    };

    let processor2 = getBatchEventProcessor(options2);
    expect(MockBatchEventProcessor.mock.calls[0][0].retryConfig).not.toBe(undefined);
    expect(MockBatchEventProcessor.mock.calls[1][0].retryConfig?.maxRetries).toBe(undefined);
  });

  it('uses exponential backoff with default parameters when retryOptions is provided without backoff values', () => {
    const options = {
      eventDispatcher: getMockEventDispatcher(),
      retryOptions: {},
    };

    let processor = getBatchEventProcessor(options);
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

    let processor = getBatchEventProcessor(options);
    const backoffProvider = MockBatchEventProcessor.mock.calls[0][0].retryConfig?.backoffProvider;

    expect(backoffProvider).not.toBe(undefined);
    const backoff = backoffProvider?.();
    expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
    expect(MockExponentialBackoff).toHaveBeenNthCalledWith(1, 1000, 2000, 500);
  });
});
