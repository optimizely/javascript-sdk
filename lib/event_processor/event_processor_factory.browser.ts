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
import { EventDispatcher } from './event_dispatcher/event_dispatcher';
import { EventProcessor } from './event_processor';
import { EventWithId } from './batch_event_processor';
import { 
  getOpaqueBatchEventProcessor,
  BatchEventProcessorOptions,
  OpaqueEventProcessor,
  wrapEventProcessor,
  getForwardingEventProcessor,
  getPrefixEventStore,
} from './event_processor_factory';
import defaultEventDispatcher from './event_dispatcher/default_dispatcher.browser';
import sendBeaconEventDispatcher from './event_dispatcher/send_beacon_dispatcher.browser';
import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';
import { DEFAULT_MAX_EVENTS_IN_STORE, EventStore } from './event_store';
import { Platform } from '../platform_support';

export const __platforms: Platform[] = ['browser'];

export const DEFAULT_EVENT_BATCH_SIZE = 10;
export const DEFAULT_EVENT_FLUSH_INTERVAL = 1_000;
export const EVENT_MAX_RETRIES_BROWSER = 5;

export const createForwardingEventProcessor = (
  eventDispatcher: EventDispatcher = defaultEventDispatcher,
): OpaqueEventProcessor => {
  return wrapEventProcessor(getForwardingEventProcessor(eventDispatcher));
};

export const createBatchEventProcessor = (
  options: BatchEventProcessorOptions = {}
): OpaqueEventProcessor => {
  const eventStore = options.eventStore ? getPrefixEventStore(options.eventStore) : new EventStore({
    store: new LocalStorageCache<EventWithId>(),
    maxSize: options.batchSize ? Math.max(options.batchSize * 2, DEFAULT_MAX_EVENTS_IN_STORE)
      : DEFAULT_MAX_EVENTS_IN_STORE,
    ttl: options.storeTtl,
  });

  return getOpaqueBatchEventProcessor({
    eventDispatcher: options.eventDispatcher || defaultEventDispatcher,
    closingEventDispatcher: options.closingEventDispatcher ||
      (options.eventDispatcher ? undefined : sendBeaconEventDispatcher),
    flushInterval: options.flushInterval,
    batchSize: options.batchSize,
    defaultFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
    defaultBatchSize: DEFAULT_EVENT_BATCH_SIZE,
    retryOptions: {
      maxRetries: options.maxRetries ?? EVENT_MAX_RETRIES_BROWSER,
    },
    failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
    eventStore,
    storeTtl: options.storeTtl,
  });
};
