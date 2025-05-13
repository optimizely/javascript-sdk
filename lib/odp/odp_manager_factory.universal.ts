import { RequestHandler } from '../utils/http_request_handler/http';
import { eventApiRequestGenerator } from './event_manager/odp_event_api_manager';
import { getOpaqueOdpManager, OdpManagerOptions, OpaqueOdpManager } from './odp_manager_factory';

export const DEFAULT_API_TIMEOUT = 10_000;
export const DEFAULT_BATCH_SIZE = 1;
export const DEFAULT_FLUSH_INTERVAL = 1000;

export type UniversalOdpManagerOptions = OdpManagerOptions & {
  requestHandler: RequestHandler;
};

export const createOdpManager = (options: UniversalOdpManagerOptions): OpaqueOdpManager => {
  return getOpaqueOdpManager({
    ...options,
    segmentRequestHandler: options.requestHandler,
    eventRequestHandler: options.requestHandler,
    eventBatchSize: options.eventBatchSize || DEFAULT_BATCH_SIZE,
    eventFlushInterval: options.eventFlushInterval || DEFAULT_FLUSH_INTERVAL,
    eventRequestGenerator: eventApiRequestGenerator,
  });
};
