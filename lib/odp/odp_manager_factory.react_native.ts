/**
 * Copyright 2024, Optimizely
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

import { BrowserRequestHandler } from '../utils/http_request_handler/request_handler.browser';
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
