/**
 * Copyright 2024-2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { RequestHandler } from "../shared_types";
import { Cache } from "../utils/cache/cache";
import { InMemoryLruCache } from "../utils/cache/in_memory_lru_cache";
import { ExponentialBackoff, IntervalRepeater } from "../utils/repeater/repeater";
import { Maybe } from "../utils/type";
import { DefaultOdpEventApiManager, EventRequestGenerator } from "./event_manager/odp_event_api_manager";
import { DefaultOdpEventManager, OdpEventManager } from "./event_manager/odp_event_manager";
import { DefaultOdpManager, OdpManager } from "./odp_manager";
import { DefaultOdpSegmentApiManager } from "./segment_manager/odp_segment_api_manager";
import { DefaultOdpSegmentManager, OdpSegmentManager } from "./segment_manager/odp_segment_manager";
import { UserAgentParser } from "./ua_parser/user_agent_parser";

export const DEFAULT_CACHE_SIZE = 1000;
export const DEFAULT_CACHE_TIMEOUT = 600_000;

export const DEFAULT_EVENT_BATCH_SIZE = 100;
export const DEFAULT_EVENT_FLUSH_INTERVAL = 10_000;
export const DEFAULT_EVENT_MAX_RETRIES = 5;
export const DEFAULT_EVENT_MIN_BACKOFF = 1000;
export const DEFAULT_EVENT_MAX_BACKOFF = 32_000;

export const INVALID_CACHE = 'Invalid cache';
export const INVALID_CACHE_METHOD = 'Invalid cache method %s';

const odpManagerSymbol: unique symbol = Symbol();

export type OpaqueOdpManager = {
  [odpManagerSymbol]: unknown;
};

export type OdpManagerOptions = {
  segmentsCache?: Cache<string[]>;
  segmentsCacheSize?: number;
  segmentsCacheTimeout?: number;
  segmentsApiTimeout?: number;
  eventFlushInterval?: number;
  eventBatchSize?: number;
  eventApiTimeout?: number;
  userAgentParser?: UserAgentParser;
};

export type OdpManagerFactoryOptions = Omit<OdpManagerOptions,  'segmentsApiTimeout' | 'eventApiTimeout'> & {
  segmentRequestHandler: RequestHandler;
  eventRequestHandler: RequestHandler;
  eventRequestGenerator: EventRequestGenerator;
  eventMaxRetries?: number;
  eventMinBackoff?: number;
  eventMaxBackoff?: number;
}

const validateCache = (cache: any) => {
  const errors = [];
  if (!cache || typeof cache !== 'object') {
    throw new Error(INVALID_CACHE);
  }

  for (const method of ['save', 'lookup', 'reset']) {
    if (typeof cache[method] !== 'function') {
      errors.push(INVALID_CACHE_METHOD.replace('%s', method));
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}

const getDefaultSegmentsCache = (cacheSize?: number, cacheTimeout?: number) => {
  return new InMemoryLruCache<string[]>(cacheSize || DEFAULT_CACHE_SIZE, cacheTimeout || DEFAULT_CACHE_TIMEOUT);
}

const getDefaultSegmentManager = (options: OdpManagerFactoryOptions) => {
  if (options.segmentsCache) {
    validateCache(options.segmentsCache);
  }
  
  return new DefaultOdpSegmentManager(
    options.segmentsCache || getDefaultSegmentsCache(options.segmentsCacheSize, options.segmentsCacheTimeout),
    new DefaultOdpSegmentApiManager(options.segmentRequestHandler),
  );
};

const getDefaultEventManager = (options: OdpManagerFactoryOptions) => {
  return new DefaultOdpEventManager({
    apiManager: new DefaultOdpEventApiManager(options.eventRequestHandler, options.eventRequestGenerator),
    batchSize: options.eventBatchSize || DEFAULT_EVENT_BATCH_SIZE,
    repeater: new IntervalRepeater(options.eventFlushInterval || DEFAULT_EVENT_FLUSH_INTERVAL),
    retryConfig: {
      maxRetries: options.eventMaxRetries || DEFAULT_EVENT_MAX_RETRIES,
      backoffProvider: () => new ExponentialBackoff(
        options.eventMinBackoff || DEFAULT_EVENT_MIN_BACKOFF,
        options.eventMaxBackoff || DEFAULT_EVENT_MAX_BACKOFF,
        500,
      ),
    },
  });
}

export const getOdpManager = (options: OdpManagerFactoryOptions): OdpManager => {
  const segmentManager = getDefaultSegmentManager(options);
  const eventManager = getDefaultEventManager(options);

  return new DefaultOdpManager({
    segmentManager,
    eventManager,
    userAgentParser: options.userAgentParser,
  });
};

export const getOpaqueOdpManager = (options: OdpManagerFactoryOptions): OpaqueOdpManager => {
  return {
    [odpManagerSymbol]: getOdpManager(options),
  };
};

export const extractOdpManager = (manager: Maybe<OpaqueOdpManager>): Maybe<OdpManager> => {
  if (!manager || typeof manager !== 'object') {
    return undefined;
  }

  return manager[odpManagerSymbol] as Maybe<OdpManager>;
}
