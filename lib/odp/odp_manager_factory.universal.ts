/**
 * Copyright 2025, Optimizely
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

import { RequestHandler } from '../utils/http_request_handler/http';
import { validateRequestHandler } from '../utils/http_request_handler/request_handler_validator';
import { eventApiRequestGenerator } from './event_manager/odp_event_api_manager';
import { getOpaqueOdpManager, OdpManagerOptions, OpaqueOdpManager } from './odp_manager_factory';

export const DEFAULT_API_TIMEOUT = 10_000;
export const DEFAULT_BATCH_SIZE = 1;
export const DEFAULT_FLUSH_INTERVAL = 1000;

export type UniversalOdpManagerOptions = OdpManagerOptions & {
  requestHandler: RequestHandler;
};

export const createOdpManager = (options: UniversalOdpManagerOptions): OpaqueOdpManager => {
  validateRequestHandler(options.requestHandler);
  return getOpaqueOdpManager({
    ...options,
    segmentRequestHandler: options.requestHandler,
    eventRequestHandler: options.requestHandler,
    eventBatchSize: options.eventBatchSize || DEFAULT_BATCH_SIZE,
    eventFlushInterval: options.eventFlushInterval || DEFAULT_FLUSH_INTERVAL,
    eventRequestGenerator: eventApiRequestGenerator,
  });
};
