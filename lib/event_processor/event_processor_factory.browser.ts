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

import { getForwardingEventProcessor } from './forwarding_event_processor';
import { EventDispatcher } from './event_dispatcher/event_dispatcher';
import { EventProcessor } from './event_processor';
import { EventWithId } from './batch_event_processor';
import { getBatchEventProcessor, BatchEventProcessorOptions } from './event_processor_factory';
import defaultEventDispatcher from './event_dispatcher/default_dispatcher.browser';
import sendBeaconEventDispatcher from './event_dispatcher/send_beacon_dispatcher.browser';
import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { SyncPrefixCache } from '../utils/cache/cache';
import { EVENT_STORE_PREFIX, FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';

export const createForwardingEventProcessor = (
  eventDispatcher: EventDispatcher = defaultEventDispatcher,
): EventProcessor => {
  return getForwardingEventProcessor(eventDispatcher);
};

const identity = <T>(v: T): T => v;

export const createBatchEventProcessor = (
  options: BatchEventProcessorOptions
): EventProcessor => {
  const localStorageCache = new LocalStorageCache<EventWithId>();
  const eventStore = new SyncPrefixCache<EventWithId, EventWithId>(
    localStorageCache, EVENT_STORE_PREFIX,
    identity,
    identity,
  );

  return getBatchEventProcessor({
    eventDispatcher: options.eventDispatcher || defaultEventDispatcher,
    closingEventDispatcher: options.closingEventDispatcher || 
      (options.eventDispatcher ? undefined : sendBeaconEventDispatcher),
    flushInterval: options.flushInterval,
    batchSize: options.batchSize,
    retryOptions: {
      maxRetries: 5,
    },
    failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
    eventStore,
  });
};