/**
 * Copyright 2023, Optimizely
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

import { NodeRequestHandler } from '../../utils/http_request_handler/node_request_handler';

import { LRUCache } from '../../utils/lru_cache';
import { OdpManager } from '../../core/odp/odp_manager';
import { OdpSegmentManager } from '../../core/odp/odp_segment_manager';
import { OdpEventManager } from '../../core/odp/odp_event_manager';
import { getLogger, LogHandler } from '../../modules/logging';
import { ERROR_MESSAGES, LOG_LEVEL, NODE_CLIENT_ENGINE, NODE_CLIENT_VERSION } from '../../utils/enums';

// Server-side Node Plugin for ODP Manager
export class NodeOdpManager extends OdpManager {
  constructor(
    disable: boolean,
    logger: LogHandler = getLogger(),
    segmentsCache?: LRUCache<string, string[]>,
    segmentManager?: OdpSegmentManager,
    eventManager?: OdpEventManager
  ) {
    if (disable) {
      logger.log(LOG_LEVEL.INFO, ERROR_MESSAGES.ODP_NOT_ENABLED);
      return;
    }

    const nodeRequestHandler = new NodeRequestHandler(logger);
    const nodeClientEngine = NODE_CLIENT_ENGINE;
    const nodeClientVersion = NODE_CLIENT_VERSION;

    super({
      disable,
      requestHandler: nodeRequestHandler,
      logger,
      clientEngine: nodeClientEngine,
      clientVersion: nodeClientVersion,
      segmentsCache,
      segmentManager,
      eventManager,
    });
  }
}
