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
import defaultEventDispatcher from './default_dispatcher.browser';
import { BatchEventProcessorOptions, getBatchEventProcessor } from './event_processor_factory';
import { EVENT_STORE_PREFIX, FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';
import { AsyncPrefixCache, Cache, SyncPrefixCache } from '../utils/cache/cache';
import { EventWithId } from './batch_event_processor';

export const createForwardingEventProcessor = (
  eventDispatcher: EventDispatcher = defaultEventDispatcher,
): EventProcessor => {
  return getForwardingEventProcessor(eventDispatcher);
};

const identity = <T>(v: T): T => v;

const getDefaultEventStore = () => {
  const AsyncStorageCache = require('../utils/cache/async_storage_cache.react_native').AsyncStorageCache;

  const asyncStorageCache = new AsyncStorageCache();

  const eventStore = new AsyncPrefixCache<EventWithId, EventWithId>(
    asyncStorageCache, 
    EVENT_STORE_PREFIX,
    identity,
    identity,
  );

  return eventStore;
}

const getPrefixEventStore = (cache: Cache<string>): Cache<EventWithId> => {
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

export const createBatchEventProcessor = (
  options: BatchEventProcessorOptions
): EventProcessor => {
  const eventStore = options.eventStore ? getPrefixEventStore(options.eventStore) : getDefaultEventStore();
  
  return getBatchEventProcessor({
    eventDispatcher: options.eventDispatcher || defaultEventDispatcher,
    flushInterval: options.flushInterval,
    batchSize: options.batchSize,
    retryOptions: {
      maxRetries: 5,
    },
    failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
    eventStore,
  });
};
