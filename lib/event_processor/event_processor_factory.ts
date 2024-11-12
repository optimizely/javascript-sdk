import { LogLevel } from "../common_exports";
import { StartupLog } from "../service";
import { ExponentialBackoff, IntervalRepeater } from "../utils/repeater/repeater";
import { EventDispatcher } from "./eventDispatcher";
import { EventProcessor } from "./eventProcessor";
import { QueueingEventProcessor, RetryConfig } from "./queueing_event_processor";

export const DEFAULT_EVENT_BATCH_SIZE = 10;
export const DEFAULT_EVENT_FLUSH_INTERVAL = 1000;
export const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;
export const DEFAULT_MIN_BACKOFF = 1000;
export const DEFAULT_MAX_BACKOFF = 32000;

export type QueueingEventProcessorOptions = {
  eventDispatcher?: EventDispatcher;
  closingEventDispatcher?: EventDispatcher;
  flushInterval?: number;
  batchSize?: number;
  maxQueueSize?: number;
};

export type QueueingEventProcessorFactoryOptions = Omit<QueueingEventProcessorOptions, 'eventDispatcher'> & {
  eventDispatcher: EventDispatcher;
  failedEventRetryInterval?: number;
  retryOptions?: {
    maxRetries?: number;
    minBackoff?: number;
    maxBackoff?: number;
  };
}

export const getQueuingEventProcessor = (
    options: QueueingEventProcessorFactoryOptions,
    EventProcessorConstructor: typeof QueueingEventProcessor = QueueingEventProcessor
  ): EventProcessor => {
  const { eventDispatcher, closingEventDispatcher, retryOptions } = options;

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
      message: 'Invalid eventFlushInterval %s, defaulting to %s',
      params: [options.flushInterval, DEFAULT_EVENT_FLUSH_INTERVAL],
    });
  } else {
    flushInterval = options.flushInterval;
  }

  let batchSize = DEFAULT_EVENT_BATCH_SIZE;
  if (options.batchSize === undefined || options.batchSize <= 0) {
    startupLogs.push({
      level: LogLevel.WARNING,
      message: 'Invalid eventBatchSize %s, defaulting to %s',
      params: [options.batchSize, DEFAULT_EVENT_BATCH_SIZE],
    });
  } else {
    batchSize = options.batchSize;
  }

  const maxQueueSize = options.maxQueueSize ?? DEFAULT_EVENT_MAX_QUEUE_SIZE;

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
    maxQueueSize,
    startupLogs
  });
};
