import { RequestHandler } from "../shared_types";
import { Cache } from "../utils/cache/cache";
import { InMemoryLruCache } from "../utils/cache/in_memory_lru_cache";
import { ExponentialBackoff, IntervalRepeater } from "../utils/repeater/repeater";
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

export type OdpManagerOptions = {
  segmentsCache?: Cache<string[]>;
  segmentsCacheSize?: number;
  segmentsCacheTimeout?: number;
  segmentsApiTimeout?: number;
  segmentManager?: OdpSegmentManager;
  eventFlushInterval?: number;
  eventBatchSize?: number;
  eventApiTimeout?: number;
  eventManager?: OdpEventManager;
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

const getDefaultSegmentsCache = (cacheSize?: number, cacheTimeout?: number) => {
  return new InMemoryLruCache<string[]>(cacheSize || DEFAULT_CACHE_SIZE, cacheTimeout || DEFAULT_CACHE_TIMEOUT);
}

const getDefaultSegmentManager = (options: OdpManagerFactoryOptions) => {
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
  const segmentManager = options.segmentManager || getDefaultSegmentManager(options);
  const eventManager = options.eventManager || getDefaultEventManager(options);

  return new DefaultOdpManager({
    segmentManager,
    eventManager,
    userAgentParser: options.userAgentParser,
  });
};
