import { LogLevel } from "../common_exports";
import { StartupLog } from "../service";
import { ExponentialBackoff, IntervalRepeater } from "../utils/repeater/repeater";
import { EventDispatcher } from "./eventDispatcher";
import { EventProcessor } from "./eventProcessor";
import { BatchEventProcessor, EventWithId, RetryConfig } from "./batch_event_processor";
import { AsyncPrefixCache, Cache, SyncPrefixCache } from "../utils/cache/cache";

export const DEFAULT_EVENT_BATCH_SIZE = 10;
export const DEFAULT_EVENT_FLUSH_INTERVAL = 1000;
export const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;
export const DEFAULT_MIN_BACKOFF = 1000;
export const DEFAULT_MAX_BACKOFF = 32000;
export const FAILED_EVENT_RETRY_INTERVAL = 20 * 1000; 
export const EVENT_STORE_PREFIX = 'optly_event:';

export const getPrefixEventStore = (cache: Cache<string>): Cache<EventWithId> => {
  if (cache.operation === 'async') {
    return new AsyncPrefixCache<string, EventWithId>(
      cache, 
      EVENT_STORE_PREFIX,
      JSON.parse,
      JSON.stringify,
    );
  } else {
    return new SyncPrefixCache<string, EventWithId>(
      cache, 
      EVENT_STORE_PREFIX,
      JSON.parse,
      JSON.stringify,
    );
  }
};

export type BatchEventProcessorOptions = {
  eventDispatcher?: EventDispatcher;
  closingEventDispatcher?: EventDispatcher;
  flushInterval?: number;
  batchSize?: number;
  eventStore?: Cache<string>;
};

export type BatchEventProcessorFactoryOptions = Omit<BatchEventProcessorOptions, 'eventDispatcher' | 'eventStore'> & {
  eventDispatcher: EventDispatcher;
  failedEventRetryInterval?: number;
  eventStore?: Cache<EventWithId>;
  retryOptions?: {
    maxRetries?: number;
    minBackoff?: number;
    maxBackoff?: number;
  };
}

export const getBatchEventProcessor = (
    options: BatchEventProcessorFactoryOptions,
    EventProcessorConstructor: typeof BatchEventProcessor = BatchEventProcessor
  ): EventProcessor => {
  const { eventDispatcher, closingEventDispatcher, retryOptions, eventStore } = options;

  const retryConfig: RetryConfig | undefined = retryOptions ? {
    maxRetries: retryOptions.maxRetries,
    backoffProvider: () => {
      const minBackoff = retryOptions?.minBackoff ?? DEFAULT_MIN_BACKOFF;
      const maxBackoff = retryOptions?.maxBackoff ?? DEFAULT_MAX_BACKOFF;
      return new ExponentialBackoff(minBackoff, maxBackoff, 500);
    }
  } : undefined;

  const startupLogs: StartupLog[] = [];

  let flushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
  if (options.flushInterval === undefined || options.flushInterval <= 0) {
    startupLogs.push({
      level: LogLevel.WARNING,
      message: 'Invalid flushInterval %s, defaulting to %s',
      params: [options.flushInterval, DEFAULT_EVENT_FLUSH_INTERVAL],
    });
  } else {
    flushInterval = options.flushInterval;
  }

  let batchSize = DEFAULT_EVENT_BATCH_SIZE;
  if (options.batchSize === undefined || options.batchSize <= 0) {
    startupLogs.push({
      level: LogLevel.WARNING,
      message: 'Invalid batchSize %s, defaulting to %s',
      params: [options.batchSize, DEFAULT_EVENT_BATCH_SIZE],
    });
  } else {
    batchSize = options.batchSize;
  }

  const dispatchRepeater = new IntervalRepeater(flushInterval);
  const failedEventRepeater = options.failedEventRetryInterval ?
    new IntervalRepeater(options.failedEventRetryInterval) : undefined;

  return new EventProcessorConstructor({
    eventDispatcher,
    closingEventDispatcher,
    dispatchRepeater,
    failedEventRepeater,
    retryConfig,
    batchSize,
    eventStore,
    startupLogs,
  });
};
