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
