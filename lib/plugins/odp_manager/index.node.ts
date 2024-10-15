/**
 * Copyright 2023-2024, Optimizely
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
  NODE_CLIENT_ENGINE,
  CLIENT_VERSION,
  REQUEST_TIMEOUT_ODP_EVENTS_MS,
  REQUEST_TIMEOUT_ODP_SEGMENTS_MS,
} from '../../utils/enums';

import { OdpManager } from '../../core/odp/odp_manager';
import { IOdpEventManager, OdpOptions } from '../../shared_types';
import { NodeOdpEventApiManager } from '../odp/event_api_manager/index.node';
import { NodeOdpEventManager } from '../odp/event_manager/index.node';
import { IOdpSegmentManager, OdpSegmentManager } from '../../core/odp/odp_segment_manager';
import { OdpSegmentApiManager } from '../../core/odp/odp_segment_api_manager';
import { OdpConfig, OdpIntegrationConfig } from '../../core/odp/odp_config';

interface NodeOdpManagerConfig {
  clientEngine?: string,
  clientVersion?: string,
  logger?: LogHandler;
  odpOptions?: OdpOptions;
  odpIntegrationConfig?: OdpIntegrationConfig;
}

/**
 * Server-side Node Plugin for ODP Manager.
 * Note: As this is still a work-in-progress. Please avoid using the Node ODP Manager.
 */
export class NodeOdpManager extends OdpManager {
  constructor(options: {
    odpIntegrationConfig?: OdpIntegrationConfig;
    segmentManager: IOdpSegmentManager;
    eventManager: IOdpEventManager;
    logger: LogHandler;
  }) {
    super(options);
  }

  static createInstance({
    logger, odpOptions, odpIntegrationConfig, clientEngine, clientVersion
  }: NodeOdpManagerConfig): NodeOdpManager {
    logger = logger || getLogger();

    clientEngine = clientEngine || NODE_CLIENT_ENGINE;
    clientVersion = clientVersion || CLIENT_VERSION;

    let odpConfig : OdpConfig | undefined = undefined;
    if (odpIntegrationConfig?.integrated) {
      odpConfig = odpIntegrationConfig.odpConfig;
    }

    let customSegmentRequestHandler;

    if (odpOptions?.segmentsRequestHandler) {
      customSegmentRequestHandler = odpOptions.segmentsRequestHandler;
    } else {
      customSegmentRequestHandler = new NodeRequestHandler(
        logger,
        odpOptions?.segmentsApiTimeout || REQUEST_TIMEOUT_ODP_SEGMENTS_MS
      );
    }

    let segmentManager: IOdpSegmentManager;

    if (odpOptions?.segmentManager) {
      segmentManager = odpOptions.segmentManager;
    } else {
      segmentManager = new OdpSegmentManager(
        odpOptions?.segmentsCache ||
          new ServerLRUCache<string, string[]>({
            maxSize: odpOptions?.segmentsCacheSize,
            timeout: odpOptions?.segmentsCacheTimeout,
          }),
        new OdpSegmentApiManager(customSegmentRequestHandler, logger),
        logger,
        odpConfig
      );
    }

    let customEventRequestHandler;

    if (odpOptions?.eventRequestHandler) {
      customEventRequestHandler = odpOptions.eventRequestHandler;
    } else {
      customEventRequestHandler = new NodeRequestHandler(
        logger,
        odpOptions?.eventApiTimeout || REQUEST_TIMEOUT_ODP_EVENTS_MS
      );
    }

    let eventManager: IOdpEventManager;

    if (odpOptions?.eventManager) {
      eventManager = odpOptions.eventManager;
    } else {
      eventManager = new NodeOdpEventManager({
        odpConfig,
        apiManager: new NodeOdpEventApiManager(customEventRequestHandler, logger),
        logger: logger,
        clientEngine,
        clientVersion,
        flushInterval: odpOptions?.eventFlushInterval,
        batchSize: odpOptions?.eventBatchSize,
        queueSize: odpOptions?.eventQueueSize,
        userAgentParser: odpOptions?.userAgentParser,
      });
    }

    return new NodeOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
    });
  }
  
  registerVuid(vuid: string): void {
    this.logger.log(LogLevel.ERROR, `Unable to registerVuid ${vuid || ''} in a node server context`);
  }
}