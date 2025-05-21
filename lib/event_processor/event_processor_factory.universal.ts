/**
 * Copyright 2025, Optimizely
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

import { getForwardingEventProcessor } from './event_processor_factory';
import { EventDispatcher } from './event_dispatcher/event_dispatcher';

import { 
  getOpaqueBatchEventProcessor,
  BatchEventProcessorOptions,
  OpaqueEventProcessor,
  wrapEventProcessor,
  getPrefixEventStore,
} from './event_processor_factory';

export const DEFAULT_EVENT_BATCH_SIZE = 10;
export const DEFAULT_EVENT_FLUSH_INTERVAL = 1_000;

import { FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';

export const createForwardingEventProcessor = (
  eventDispatcher: EventDispatcher
): OpaqueEventProcessor => {
  return wrapEventProcessor(getForwardingEventProcessor(eventDispatcher));
};

export type UniversalBatchEventProcessorOptions = Omit<BatchEventProcessorOptions, 'eventDispatcher'> & {
  eventDispatcher: EventDispatcher;
}

export const createBatchEventProcessor = (
  options: UniversalBatchEventProcessorOptions
): OpaqueEventProcessor => {
  const eventStore = options.eventStore ? getPrefixEventStore(options.eventStore) : undefined;

  return getOpaqueBatchEventProcessor({
    eventDispatcher: options.eventDispatcher,
    closingEventDispatcher: options.closingEventDispatcher,
    flushInterval: options.flushInterval,
    batchSize: options.batchSize,
    defaultFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
    defaultBatchSize: DEFAULT_EVENT_BATCH_SIZE,
    retryOptions: {
      maxRetries: 5,
    },
    failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
    eventStore: eventStore,
  });
};
