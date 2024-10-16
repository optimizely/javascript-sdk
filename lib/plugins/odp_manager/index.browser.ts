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

import {
  CLIENT_VERSION,
  ERROR_MESSAGES,
  JAVASCRIPT_CLIENT_ENGINE,
  REQUEST_TIMEOUT_ODP_SEGMENTS_MS,
  REQUEST_TIMEOUT_ODP_EVENTS_MS,
} from '../../utils/enums';
import { getLogger, LogHandler, LogLevel } from '../../modules/logging';

import { BrowserRequestHandler } from './../../utils/http_request_handler/browser_request_handler';

import { BrowserLRUCache } from '../../utils/lru_cache';

import { VuidManager } from './../vuid_manager/index';

import { OdpManager } from '../../core/odp/odp_manager';
import { IOdpEventManager, OdpOptions } from '../../shared_types';
import { BrowserOdpEventApiManager } from '../odp/event_api_manager/index.browser';
import { BrowserOdpEventManager } from '../odp/event_manager/index.browser';
import { IOdpSegmentManager, OdpSegmentManager } from '../../core/odp/odp_segment_manager';
import { OdpSegmentApiManager } from '../../core/odp/odp_segment_api_manager';
import { OdpConfig, OdpIntegrationConfig } from '../../core/odp/odp_config';

interface BrowserOdpManagerConfig {
  clientEngine?: string,
  clientVersion?: string,
  logger?: LogHandler;
  odpOptions?: OdpOptions;
  odpIntegrationConfig?: OdpIntegrationConfig;
}

// Client-side Browser Plugin for ODP Manager
export class BrowserOdpManager extends OdpManager {
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
  }: BrowserOdpManagerConfig): BrowserOdpManager {
    logger = logger || getLogger();

    clientEngine = clientEngine || JAVASCRIPT_CLIENT_ENGINE;
    clientVersion = clientVersion || CLIENT_VERSION;

    let odpConfig : OdpConfig | undefined = undefined;
    if (odpIntegrationConfig?.integrated) {
      odpConfig = odpIntegrationConfig.odpConfig;
    }

    let customSegmentRequestHandler;
    
    if (odpOptions?.segmentsRequestHandler) {
      customSegmentRequestHandler = odpOptions.segmentsRequestHandler;
    } else {
      customSegmentRequestHandler = new BrowserRequestHandler(
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
          new BrowserLRUCache<string, string[]>({
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
      customEventRequestHandler = new BrowserRequestHandler(
        logger,
        odpOptions?.eventApiTimeout || REQUEST_TIMEOUT_ODP_EVENTS_MS
      );
    }

    let eventManager: IOdpEventManager;
        
    if (odpOptions?.eventManager) {
      eventManager = odpOptions.eventManager;
    } else {
      eventManager = new BrowserOdpEventManager({
        odpConfig,
        apiManager: new BrowserOdpEventApiManager(customEventRequestHandler, logger),
        logger: logger,
        clientEngine,
        clientVersion,
        flushInterval: odpOptions?.eventFlushInterval,
        batchSize: odpOptions?.eventBatchSize,
        queueSize: odpOptions?.eventQueueSize,
        userAgentParser: odpOptions?.userAgentParser,
      });
    }

    return new BrowserOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
    });
  }

  /**
   * @override
   * - Still identifies a user via the ODP Event Manager
   * - Additionally, also passes VUID to help identify client-side users
   * @param fsUserId Unique identifier of a target user.
   */
  identifyUser(fsUserId?: string, vuid?: string): void {
    if (fsUserId && VuidManager.isVuid(fsUserId)) {
      super.identifyUser(undefined, fsUserId);
      return;
    }

    if (fsUserId && vuid && VuidManager.isVuid(vuid)) {
      super.identifyUser(fsUserId, vuid);
      return;
    }

    super.identifyUser(fsUserId, vuid);
  }

  registerVuid(vuid: string): void {
    if (!this.odpIntegrationConfig) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
      return;
    }

    if (!this.odpIntegrationConfig.integrated) {
      this.logger.log(LogLevel.INFO, ERROR_MESSAGES.ODP_NOT_INTEGRATED);
      return;
    }

    try {
      this.eventManager.registerVuid(vuid);
    } catch (e) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_VUID_REGISTRATION_FAILED);
    }
  }
}
