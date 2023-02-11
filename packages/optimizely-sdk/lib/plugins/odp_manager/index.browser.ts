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

import packageJSON from '../../../package.json';

import BrowserAsyncStorageCache from '../key_value_cache/browserAsyncStorageCache';

import { BrowserRequestHandler } from './../../utils/http_request_handler/browser_request_handler';
import { LRUCache } from '../../utils/lru_cache';

import { VuidManager } from './../vuid_manager/index';

import { OdpConfig } from './../../core/odp/odp_config';
import { OdpManager } from '../../core/odp/odp_manager';
import { OdpEvent } from '../../core/odp/odp_event';
import { invalidOdpDataFound } from '../../core/odp/odp_utils';
import { OdpEventApiManager } from '../../core/odp/odp_event_api_manager';
import { OdpEventManager, STATE } from '../../core/odp/odp_event_manager';
import { OdpSegmentApiManager } from '../../core/odp/odp_segment_api_manager';
import { OdpSegmentManager } from '../../core/odp/odp_segment_manager';
import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { ERROR_MESSAGES, JAVASCRIPT_CLIENT_ENGINE, LOG_MESSAGES, ODP_USER_KEY } from '../../utils/enums';
import PersistentKeyValueCache from '../key_value_cache/persistentKeyValueCache';

interface BrowserOdpManagerConfig {
  disable: boolean;
  logger?: LogHandler;
  odpConfig?: OdpConfig;
  segmentsCache?: LRUCache<string, string[]>;
  eventManager?: OdpEventManager;
  segmentManager?: OdpSegmentManager;
}

// Client-side Browser Plugin for ODP Manager
export class BrowserOdpManager extends OdpManager {
  static cache = new BrowserAsyncStorageCache();
  vuid?: string;

  constructor({ disable, logger, odpConfig, segmentsCache, eventManager, segmentManager }: BrowserOdpManagerConfig) {
    const browserLogger = logger || getLogger();

    const browserRequestHandler = new BrowserRequestHandler(browserLogger);
    const browserClientEngine = JAVASCRIPT_CLIENT_ENGINE;
    const browserClientVersion = packageJSON.version;

    super({
      disable,
      requestHandler: browserRequestHandler,
      logger: browserLogger,
      clientEngine: browserClientEngine,
      clientVersion: browserClientVersion,
      odpConfig,
      segmentsCache,
      eventManager,
      segmentManager,
    });

    this.logger = browserLogger;

    // TODO: Think of better way to trigger initializeVuid after this.eventManager is guaranteed to exist. Promise?
    setTimeout(() => {
      this.initializeVuid(BrowserOdpManager.cache);
    }, 200);
  }

  /**
   * Upon initializing BrowserOdpManager, accesses or creates new VUID from Browser cache and registers it via the Event Manager
   */
  private async initializeVuid(cache: PersistentKeyValueCache): Promise<void> {
    const vuidManager = await VuidManager.instance(cache);
    this.vuid = vuidManager.vuid;
    if (this.eventManager) {
      this.eventManager.registerVuid(vuidManager.vuid);
    } else {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_VUID_REGISTRATION_FAILED);
    }
    return;
  }

  /**
   * @override
   * - Still identifies a user via the ODP Event Manager
   * - Additionally, also passes VUID to help identify client-side users
   * @param userId Unique identifier of a target user.
   */
  public async identifyUser(userId: string): Promise<void> {
    if (!this.enabled) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED);
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_NOT_INTEGRATED);
      return;
    }

    try {
      const vuidManager = await VuidManager.instance(BrowserOdpManager.cache);
      let vuid = vuidManager.vuid;
      let fsUserId: string | undefined = userId;
      if (VuidManager.isVuid(fsUserId)) {
        vuid = fsUserId;
        fsUserId = undefined;
      }
      this.eventManager.identifyUser(vuid, fsUserId);
    } catch (e) {
      this.logger.log(LogLevel.ERROR, LOG_MESSAGES.ODP_IDENTIFY_FAILED_VUID_MISSING);
    }
  }

  /**
   * @override
   * - Sends an event to the ODP Server via the ODP Events API
   * - Intercepts identifiers and injects VUID before sending event
   * @param type The event type
   * @param action The event action name
   * @param identifiers A map of identifiers
   * @param data A map of associated data; default event data will be included here before sending to ODP
   */
  public async sendEvent(
    type: string,
    action: string,
    identifiers: Map<string, string>,
    data: Map<string, any>
  ): Promise<void> {
    if (!this.enabled) {
      throw new Error(ERROR_MESSAGES.ODP_NOT_ENABLED);
    }

    if (!this.odpConfig.isReady()) {
      throw new Error(ERROR_MESSAGES.ODP_NOT_INTEGRATED);
    }

    if (invalidOdpDataFound(data)) {
      throw new Error(ERROR_MESSAGES.ODP_INVALID_DATA);
    }

    try {
      const identifiersWithVuid = new Map(identifiers);

      if (!identifiers.has(ODP_USER_KEY.VUID)) {
        const vuidManager = await VuidManager.instance(BrowserOdpManager.cache);
        identifiersWithVuid.set(ODP_USER_KEY.VUID, vuidManager.vuid);
      }

      this.eventManager.sendEvent(new OdpEvent(type, action, identifiers, data));
    } catch (e) {
      this.logger.log(LogLevel.ERROR, LOG_MESSAGES.ODP_IDENTIFY_FAILED_VUID_MISSING);
    }
  }
}
