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
import { getForwardingEventProcessor } from './forwarding_event_processor';
import { EventDispatcher } from './event_dispatcher/event_dispatcher';
import { EventProcessor } from './event_processor';
import defaultEventDispatcher from './event_dispatcher/default_dispatcher.browser';
import { 
  BatchEventProcessorOptions,
  getOpaqueBatchEventProcessor,
  getPrefixEventStore, 
  OpaqueEventProcessor,
  wrapEventProcessor,
} from './event_processor_factory';
import { EVENT_STORE_PREFIX, FAILED_EVENT_RETRY_INTERVAL } from './event_processor_factory';
import { AsyncPrefixCache } from '../utils/cache/cache';
import { BatchEventProcessor, EventWithId } from './batch_event_processor';
import { AsyncStorageCache } from '../utils/cache/async_storage_cache.react_native';
import { ReactNativeNetInfoEventProcessor } from './batch_event_processor.react_native';
import { isAvailable as isNetInfoAvailable } from '../utils/import.react_native/@react-native-community/netinfo';

export const createForwardingEventProcessor = (
  eventDispatcher: EventDispatcher = defaultEventDispatcher,
): OpaqueEventProcessor => {
  return wrapEventProcessor(getForwardingEventProcessor(eventDispatcher));
};

const identity = <T>(v: T): T => v;

const getDefaultEventStore = () => {
  const asyncStorageCache = new AsyncStorageCache<EventWithId>();

  const eventStore = new AsyncPrefixCache<EventWithId, EventWithId>(
    asyncStorageCache, 
    EVENT_STORE_PREFIX,
    identity,
    identity,
  );

  return eventStore;
}

export const createBatchEventProcessor = (
  options: BatchEventProcessorOptions = {}
): OpaqueEventProcessor => {
  const eventStore = options.eventStore ? getPrefixEventStore(options.eventStore) : getDefaultEventStore();
  
  return getOpaqueBatchEventProcessor({
    eventDispatcher: options.eventDispatcher || defaultEventDispatcher,
    closingEventDispatcher: options.closingEventDispatcher,
    flushInterval: options.flushInterval,
    batchSize: options.batchSize,
    retryOptions: {
      maxRetries: 5,
    },
    failedEventRetryInterval: FAILED_EVENT_RETRY_INTERVAL,
    eventStore,
  }, isNetInfoAvailable() ? ReactNativeNetInfoEventProcessor : BatchEventProcessor);
};
