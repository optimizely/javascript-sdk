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

import { NodeRequestHandler } from '../utils/http_request_handler/request_handler.node';
import { eventApiRequestGenerator } from './event_manager/odp_event_api_manager';
import { getOpaqueOdpManager, OdpManagerOptions, OpaqueOdpManager } from './odp_manager_factory';

export const NODE_DEFAULT_API_TIMEOUT = 10_000;
export const NODE_DEFAULT_BATCH_SIZE = 10;
export const NODE_DEFAULT_FLUSH_INTERVAL = 1000;

export const createOdpManager = (options: OdpManagerOptions = {}): OpaqueOdpManager => {
  const segmentRequestHandler = new NodeRequestHandler({ 
    timeout: options.segmentsApiTimeout || NODE_DEFAULT_API_TIMEOUT,
  });

  const eventRequestHandler = new NodeRequestHandler({ 
    timeout: options.eventApiTimeout || NODE_DEFAULT_API_TIMEOUT,
  });

  return getOpaqueOdpManager({
    ...options,
    segmentRequestHandler,
    eventRequestHandler,
    eventBatchSize: options.eventBatchSize || NODE_DEFAULT_BATCH_SIZE,
    eventFlushInterval: options.eventFlushInterval || NODE_DEFAULT_FLUSH_INTERVAL,
    eventRequestGenerator: eventApiRequestGenerator,
  });
};
