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

import { LogLevel } from "../logging/logger";
import { StartupLog } from "../service";
import { ExponentialBackoff, IntervalRepeater } from "../utils/repeater/repeater";
import { EventDispatcher } from "./event_dispatcher/event_dispatcher";
import { EventProcessor } from "./event_processor";
import { ForwardingEventProcessor } from "./forwarding_event_processor";
import { BatchEventProcessor, DEFAULT_MAX_BACKOFF, DEFAULT_MIN_BACKOFF, EventWithId, RetryConfig } from "./batch_event_processor";
import { AsyncPrefixStore, Store, SyncPrefixStore } from "../utils/cache/store";
import { Maybe } from "../utils/type";
import { validateStore } from "../utils/cache/store_validator";

export const INVALID_EVENT_DISPATCHER = 'Invalid event dispatcher';

export const FAILED_EVENT_RETRY_INTERVAL = 20 * 1000; 
export const EVENT_STORE_PREFIX = 'optly_event:';

export const getPrefixEventStore = (store: Store<string>): Store<EventWithId> => {
  if (store.operation === 'async') {
    return new AsyncPrefixStore<string, EventWithId>(
      store, 
      EVENT_STORE_PREFIX,
      JSON.parse,
      JSON.stringify,
    );
  } else {
    return new SyncPrefixStore<string, EventWithId>(
      store, 
      EVENT_STORE_PREFIX,
      JSON.parse,
      JSON.stringify,
    );
  }
};

const eventProcessorSymbol: unique symbol = Symbol();

export type OpaqueEventProcessor = {
  [eventProcessorSymbol]: unknown;
};

export type BatchEventProcessorOptions = {
  eventDispatcher?: EventDispatcher;
  closingEventDispatcher?: EventDispatcher;
  flushInterval?: number;
  batchSize?: number;
  eventStore?: Store<string>;
};

export type BatchEventProcessorFactoryOptions = Omit<BatchEventProcessorOptions, 'eventDispatcher' | 'eventStore' > & {
  eventDispatcher: EventDispatcher;
  closingEventDispatcher?: EventDispatcher;
  failedEventRetryInterval?: number;
  defaultFlushInterval: number;
  defaultBatchSize: number;
  eventStore?: Store<EventWithId>;
  retryOptions?: {
    maxRetries: number;
    minBackoff?: number;
    maxBackoff?: number;
  };
}

export const validateEventDispatcher = (eventDispatcher: EventDispatcher): void => {
  if (!eventDispatcher || typeof eventDispatcher !== 'object' || typeof eventDispatcher.dispatchEvent !== 'function') {
    throw new Error(INVALID_EVENT_DISPATCHER);
  }
}

export const getBatchEventProcessor = (
    options: BatchEventProcessorFactoryOptions,
    EventProcessorConstructor: typeof BatchEventProcessor = BatchEventProcessor
  ): EventProcessor => {
  const { eventDispatcher, closingEventDispatcher, retryOptions, eventStore } = options;

  validateEventDispatcher(eventDispatcher);
  if (closingEventDispatcher) {
    validateEventDispatcher(closingEventDispatcher);
  }

  if (eventStore) {
    validateStore(eventStore);
  }
  
  const retryConfig: RetryConfig | undefined = retryOptions ? {
    maxRetries: retryOptions.maxRetries,
    backoffProvider: () => {
      const minBackoff = retryOptions?.minBackoff ?? DEFAULT_MIN_BACKOFF;
      const maxBackoff = retryOptions?.maxBackoff ?? DEFAULT_MAX_BACKOFF;
      return new ExponentialBackoff(minBackoff, maxBackoff, 500);
    }
  } : undefined;

  const startupLogs: StartupLog[] = [];

  const { defaultFlushInterval, defaultBatchSize } = options;

  let flushInterval = defaultFlushInterval;
  if (options.flushInterval === undefined || options.flushInterval <= 0) {
    startupLogs.push({
      level: LogLevel.Warn,
      message: 'Invalid flushInterval %s, defaulting to %s',
      params: [options.flushInterval, defaultFlushInterval],
    });
  } else {
    flushInterval = options.flushInterval;
  }

  let batchSize = defaultBatchSize;
  if (options.batchSize === undefined || options.batchSize <= 0) {
    startupLogs.push({
      level: LogLevel.Warn,
      message: 'Invalid batchSize %s, defaulting to %s',
      params: [options.batchSize, defaultBatchSize],
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
}

export const wrapEventProcessor = (eventProcessor: EventProcessor): OpaqueEventProcessor => {
  return {
    [eventProcessorSymbol]: eventProcessor,
  };
}

export const getOpaqueBatchEventProcessor = (
  options: BatchEventProcessorFactoryOptions,
  EventProcessorConstructor: typeof BatchEventProcessor = BatchEventProcessor
): OpaqueEventProcessor => {
  return wrapEventProcessor(getBatchEventProcessor(options, EventProcessorConstructor));
}

export const extractEventProcessor = (eventProcessor: Maybe<OpaqueEventProcessor>): Maybe<EventProcessor> => {
  if (!eventProcessor || typeof eventProcessor !== 'object') {
    return undefined;
  }
  return eventProcessor[eventProcessorSymbol] as Maybe<EventProcessor>;
}


export function getForwardingEventProcessor(dispatcher: EventDispatcher): EventProcessor {
  validateEventDispatcher(dispatcher);
  return new ForwardingEventProcessor(dispatcher);
}
