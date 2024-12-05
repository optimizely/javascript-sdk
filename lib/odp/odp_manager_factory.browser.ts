import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import { pixelApiRequestGenerator } from './event_manager/odp_event_api_manager';
import { OdpManager } from './odp_manager';
import { getOdpManager, OdpManagerOptions } from './odp_manager_factory';

export const BROWSER_DEFAULT_API_TIMEOUT = 10_000;

export const createOdpManager = (options: OdpManagerOptions): OdpManager => {
  const segmentRequestHandler = new BrowserRequestHandler({ 
    timeout: options.segmentsApiTimeout || BROWSER_DEFAULT_API_TIMEOUT,
  });

  const eventRequestHandler = new BrowserRequestHandler({ 
    timeout: options.eventApiTimeout || BROWSER_DEFAULT_API_TIMEOUT,
  });

  return getOdpManager({
    ...options,
    eventBatchSize: 1,
    segmentRequestHandler,
    eventRequestHandler,
    eventRequestGenerator: pixelApiRequestGenerator,
  });
};
