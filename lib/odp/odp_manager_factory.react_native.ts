import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import { eventApiRequestGenerator } from './event_manager/odp_event_api_manager';
import { OdpManager } from './odp_manager';
import { getOdpManager, OdpManagerOptions } from './odp_manager_factory';

export const RN_DEFAULT_API_TIMEOUT = 10_000;
export const RN_DEFAULT_BATCH_SIZE = 10;
export const RN_DEFAULT_FLUSH_INTERVAL = 1000;

export const createOdpManager = (options: OdpManagerOptions): OdpManager => {
  let defaultRequestHandler = new BrowserRequestHandler({ timeout: RN_DEFAULT_API_TIMEOUT });

  const segmentRequestHandler = options.segmentsApiTimeout !== undefined  ?
    new BrowserRequestHandler({ timeout: options.segmentsApiTimeout }) :
    defaultRequestHandler;

  const eventRequestHandler = options.eventApiTimeout !== undefined ?
    new BrowserRequestHandler({ timeout: options.eventApiTimeout }) :
    defaultRequestHandler;

  return getOdpManager({
    ...options,
    segmentRequestHandler,
    eventRequestHandler,
    eventBatchSize: options.eventBatchSize || RN_DEFAULT_BATCH_SIZE,
    eventFlushInterval: options.eventFlushInterval || RN_DEFAULT_FLUSH_INTERVAL,
    eventRequestGenerator: eventApiRequestGenerator,
  });
};
