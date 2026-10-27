/**
 * Copyright 2024-2026, Optimizely
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
import { EVENT_STORE_LOCAL_STORAGE_NOT_AVAILABLE } from 'error_message';
import { LogLevel } from '../logging/logger';
import { Platform } from '../platform_support';
import { StartupLog } from '../service';
import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { Store } from '../utils/cache/store';
import { isLocalStorageAvailable } from '../utils/env/browser';
import { EventWithId } from './batch_event_processor';
import defaultEventDispatcher from './event_dispatcher/default_dispatcher.browser';
import { EventDispatcher } from './event_dispatcher/event_dispatcher';
import sendBeaconEventDispatcher from './event_dispatcher/send_beacon_dispatcher.browser';
import {
  BatchEventProcessorOptions,
  FAILED_EVENT_RETRY_INTERVAL,
  getForwardingEventProcessor,
  getOpaqueBatchEventProcessor,
  getPrefixEventStore,
  OpaqueEventProcessor,
  wrapEventProcessor,
} from './event_processor_factory';
import { DEFAULT_MAX_EVENTS_IN_STORE, EventStore } from './event_store';

export const DEFAULT_EVENT_BATCH_SIZE = 10;
export const DEFAULT_EVENT_FLUSH_INTERVAL = 1_000;
export const EVENT_MAX_RETRIES_BROWSER = 2;

export const createForwardingEventProcessor = (
  eventDispatcher: EventDispatcher = defaultEventDispatcher,
): OpaqueEventProcessor => {
  return wrapEventProcessor(getForwardingEventProcessor(eventDispatcher));
};

const getDefaultEventStore = (
  options: BatchEventProcessorOptions,
  startupLogs: StartupLog[],
): Store<EventWithId> | undefined => {
  if (!isLocalStorageAvailable()) {
    startupLogs.push({
      level: LogLevel.Warn,
      message: EVENT_STORE_LOCAL_STORAGE_NOT_AVAILABLE,
      params: [],
    });
    return undefined;
  }

  return new EventStore({
    store: new LocalStorageCache(),
    maxSize: options.batchSize ? Math.max(options.batchSize * 2, DEFAULT_MAX_EVENTS_IN_STORE)
      : DEFAULT_MAX_EVENTS_IN_STORE,
    ttl: options.storeTtl,
  });
};

export const createBatchEventProcessor = (
  options: BatchEventProcessorOptions = {}
): OpaqueEventProcessor => {
  const startupLogs: StartupLog[] = [];
  const eventStore = options.eventStore ? getPrefixEventStore(options.eventStore) :
    getDefaultEventStore(options, startupLogs);

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
    startupLogs,
  });
};

export const __platforms: Platform[] = ['browser'];
