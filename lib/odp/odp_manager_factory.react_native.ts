import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import { eventApiRequestGenerator } from './event_manager/odp_event_api_manager';
import { OdpManager } from './odp_manager';
import { getOdpManager, OdpManagerOptions } from './odp_manager_factory';

export const RN_DEFAULT_API_TIMEOUT = 10_000;
export const RN_DEFAULT_BATCH_SIZE = 10;
export const RN_DEFAULT_FLUSH_INTERVAL = 1000;

export const createOdpManager = (options: OdpManagerOptions): OdpManager => {
  const segmentRequestHandler = new BrowserRequestHandler({ 
    timeout: options.segmentsApiTimeout || RN_DEFAULT_API_TIMEOUT,
  });

  const eventRequestHandler = new BrowserRequestHandler({ 
    timeout: options.eventApiTimeout || RN_DEFAULT_API_TIMEOUT,
  });

  return getOdpManager({
    ...options,
    segmentRequestHandler,
    eventRequestHandler,
    eventBatchSize: options.eventBatchSize || RN_DEFAULT_BATCH_SIZE,
    eventFlushInterval: options.eventFlushInterval || RN_DEFAULT_FLUSH_INTERVAL,
    eventRequestGenerator: eventApiRequestGenerator,
  });
};
