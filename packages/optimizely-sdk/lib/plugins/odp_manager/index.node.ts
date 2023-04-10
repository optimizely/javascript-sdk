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

import { ServerLRUCache } from './../../utils/lru_cache/server_lru_cache';

import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import {
  LOG_MESSAGES,
  NODE_CLIENT_ENGINE,
  NODE_CLIENT_VERSION,
  REQUEST_TIMEOUT_ODP_EVENTS_MS,
  REQUEST_TIMEOUT_ODP_SEGMENTS_MS,
} from '../../utils/enums';

import { OdpManager } from '../../core/odp/odp_manager';
import { OdpOptions } from '../../../lib/shared_types';
import { NodeOdpEventApiManager } from '../odp/event_api_manager/index.node';
import { NodeOdpEventManager } from '../odp/event_manager/index.node';
import { OdpSegmentManager } from '../../core/odp/odp_segment_manager';
import { OdpSegmentApiManager } from '../../core/odp/odp_segment_api_manager';

interface NodeOdpManagerConfig {
  logger?: LogHandler;
  odpOptions?: OdpOptions;
}

/**
 * Server-side Node Plugin for ODP Manager.
 * Note: As this is still a work-in-progress. Please avoid using the Node ODP Manager.
 */
export class NodeOdpManager extends OdpManager {
  constructor({ logger, odpOptions }: NodeOdpManagerConfig) {
    super();

    this.logger = logger || getLogger();

    if (odpOptions?.disabled) {
      this.enabled = false;
      this.logger.log(LogLevel.INFO, LOG_MESSAGES.ODP_DISABLED);
      return;
    }

    const nodeClientEngine = NODE_CLIENT_ENGINE;
    const nodeClientVersion = NODE_CLIENT_VERSION;

    let customSegmentRequestHandler;

    if (odpOptions?.segmentsRequestHandler) {
      customSegmentRequestHandler = odpOptions.segmentsRequestHandler;
    } else {
      customSegmentRequestHandler = new NodeRequestHandler(
        this.logger,
        odpOptions?.segmentsApiTimeout || REQUEST_TIMEOUT_ODP_SEGMENTS_MS
      );
    }

    // Set up Segment Manager (Audience Segments GraphQL API Interface)
    if (odpOptions?.segmentManager) {
      this.segmentManager = odpOptions.segmentManager;
      this.segmentManager.updateSettings(this.odpConfig);
    } else {
      this.segmentManager = new OdpSegmentManager(
        this.odpConfig,
        odpOptions?.segmentsCache ||
          new ServerLRUCache<string, string[]>({
            maxSize: odpOptions?.segmentsCacheSize,
            timeout: odpOptions?.segmentsCacheTimeout,
          }),
        new OdpSegmentApiManager(customSegmentRequestHandler, this.logger)
      );
    }

    let customEventRequestHandler;

    if (odpOptions?.eventRequestHandler) {
      customEventRequestHandler = odpOptions.eventRequestHandler;
    } else {
      customEventRequestHandler = new NodeRequestHandler(
        this.logger,
        odpOptions?.eventApiTimeout || REQUEST_TIMEOUT_ODP_EVENTS_MS
      );
    }

    // Set up Events Manager (Events REST API Interface)
    if (odpOptions?.eventManager) {
      this.eventManager = odpOptions.eventManager;
      this.eventManager.updateSettings(this.odpConfig);
    } else {
      this.eventManager = new NodeOdpEventManager({
        odpConfig: this.odpConfig,
        apiManager: new NodeOdpEventApiManager(customEventRequestHandler, this.logger),
        logger: this.logger,
        clientEngine: nodeClientEngine,
        clientVersion: nodeClientVersion,
        flushInterval: odpOptions?.eventFlushInterval,
        batchSize: odpOptions?.eventBatchSize,
        queueSize: odpOptions?.eventQueueSize,
      });
    }

    this.eventManager!.start();
  }

  public isVuidEnabled(): boolean {
    return false;
  }

  public getVuid(): string | undefined {
    return undefined;
  }
}
