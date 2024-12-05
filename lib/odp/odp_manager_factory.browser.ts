import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import { pixelApiRequestGenerator } from './event_manager/odp_event_api_manager';
import { OdpManager } from './odp_manager';
import { getOdpManager, OdpManagerOptions } from './odp_manager_factory';

export const BROWSER_DEFAULT_API_TIMEOUT = 10_000;

export const createOdpManager = (options: OdpManagerOptions): OdpManager => {
  let defaultRequestHandler = new BrowserRequestHandler({ timeout: BROWSER_DEFAULT_API_TIMEOUT });

  const segmentRequestHandler = options.segmentsApiTimeout !== undefined  ?
    new BrowserRequestHandler({ timeout: options.segmentsApiTimeout }) :
    defaultRequestHandler;

  const eventRequestHandler = options.eventApiTimeout !== undefined ?
    new BrowserRequestHandler({ timeout: options.eventApiTimeout }) :
    defaultRequestHandler;

  return getOdpManager({
    ...options,
    eventBatchSize: 1,
    segmentRequestHandler,
    eventRequestHandler,
    eventRequestGenerator: pixelApiRequestGenerator,
  });
};
