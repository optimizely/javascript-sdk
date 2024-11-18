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
import { EventDispatcher } from './eventDispatcher';
import { EventProcessor } from './eventProcessor';
import { BatchEventProcessor, BatchEventProcessorConfig, EventWithId } from './batch_event_processor';
import { getBatchEventProcessor, QueueingEventProcessorOptions } from './event_processor_factory';
import defaultEventDispatcher from './default_dispatcher.browser';
import sendBeaconEventDispatcher from '../plugins/event_dispatcher/send_beacon_dispatcher';
import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { SyncPrefixCache } from '../utils/cache/cache';

export const FAILED_EVENT_RETRY_INTERVAL = 20 * 1000; 
export const EVENT_STORE_PREFIX = 'fs_optly_pending_events';

export const createForwardingEventProcessor = (
  eventDispatcher: EventDispatcher = defaultEventDispatcher,
): EventProcessor => {
  return getForwardingEventProcessor(eventDispatcher);
};

export const createQueueingEventProcessor = (
  options: QueueingEventProcessorOptions
): EventProcessor => {
  const localStorageCache = new LocalStorageCache<string>();
  const eventStore = new SyncPrefixCache<string, EventWithId>(
    localStorageCache, EVENT_STORE_PREFIX,
    JSON.parse,
    JSON.stringify
  );

  return getBatchEventProcessor({
    eventDispatcher: options.eventDispatcher || defaultEventDispatcher,
    closingEventDispatcher: options.closingEventDispatcher || 
      (options.eventDispatcher ? options.eventDispatcher : sendBeaconEventDispatcher),
    flushInterval: options.flushInterval,
    batchSize: options.batchSize,
    retryOptions: {
      maxRetries: 5,
    },
    failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
    eventStore,
  });
};
