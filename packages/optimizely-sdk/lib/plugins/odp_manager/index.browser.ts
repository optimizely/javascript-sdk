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

import { ERROR_MESSAGES, JAVASCRIPT_CLIENT_ENGINE, LOG_MESSAGES, ODP_USER_KEY } from '../../utils/enums';
import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { BrowserRequestHandler } from './../../utils/http_request_handler/browser_request_handler';

import BrowserAsyncStorageCache from '../key_value_cache/browserAsyncStorageCache';
import PersistentKeyValueCache from '../key_value_cache/persistentKeyValueCache';
import { BrowserLRUCache, LRUCache } from '../../utils/lru_cache';

import { VuidManager } from './../vuid_manager/index';

import { OdpManager } from '../../core/odp/odp_manager';
import { OdpEvent } from '../../core/odp/odp_event';
import { invalidOdpDataFound } from '../../core/odp/odp_utils';
import { OdpEventManager } from '../../core/odp/odp_event_manager';
import { OdpSegmentManager } from '../../core/odp/odp_segment_manager';
import { OptimizelySegmentOption } from '../../core/odp/optimizely_segment_option';

interface BrowserOdpManagerConfig {
  disable: boolean;
  logger?: LogHandler;
  segmentsCache?: LRUCache<string, string[]>;
  eventManager?: OdpEventManager;
  segmentManager?: OdpSegmentManager;
}

// Client-side Browser Plugin for ODP Manager
export class BrowserOdpManager extends OdpManager {
  static cache = new BrowserAsyncStorageCache();
  vuid?: string;

  constructor({ disable, logger, segmentsCache, eventManager, segmentManager }: BrowserOdpManagerConfig) {
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
      segmentsCache: segmentsCache || new BrowserLRUCache<string, string[]>(),
      eventManager,
      segmentManager,
    });

    this.logger = browserLogger;
    this.initializeVuid(BrowserOdpManager.cache);
  }

  /**
   * Upon initializing BrowserOdpManager, accesses or creates new VUID from Browser cache and registers it via the Event Manager
   */
  private async initializeVuid(cache: PersistentKeyValueCache): Promise<void> {
    const vuidManager = await VuidManager.instance(cache);
    this.vuid = vuidManager.vuid;
    this.registerVuid(this.vuid);
  }

  private registerVuid(vuid: string) {
    try {
      this.eventManager.registerVuid(vuid);
    } catch (e) {
      this.logger.log(this.enabled ? LogLevel.ERROR : LogLevel.DEBUG, ERROR_MESSAGES.ODP_VUID_REGISTRATION_FAILED);
    }
  }

  /**
   * @override
   * Attempts to fetch and return a list of a user's qualified segments from the local segments cache.
   * If no cached data exists for the target user, this fetches and caches data from the ODP server instead.
   * @param   {ODP_USER_KEY}                    userKey - Identifies the user id type. // Note: Unused in browser implementation.
   * @param   {string}                          userId  - Unique identifier of a target user.
   * @param   {Array<OptimizelySegmentOption>}  options - An array of OptimizelySegmentOption used to ignore and/or reset the cache.
   * @returns {Promise<string[] | null>}        A promise holding either a list of qualified segments or null.
   */
  public async fetchQualifiedSegments(
    userKey: ODP_USER_KEY,
    userId: string,
    options: Array<OptimizelySegmentOption> = []
  ): Promise<string[] | null> {
    if (VuidManager.isVuid(userId)) {
      this.vuid = userId;
      return super.fetchQualifiedSegments(ODP_USER_KEY.VUID, userId, options);
    }

    return super.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, userId, options);
  }

  /**
   * @override
   * - Still identifies a user via the ODP Event Manager
   * - Additionally, also passes VUID to help identify client-side users
   * @param userId Unique identifier of a target user.
   */
  public identifyUser(userId: string): void {
    if (VuidManager.isVuid(userId)) {
      this.vuid = userId;
      super.identifyUser('', userId);
      return;
    }

    super.identifyUser(userId);
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
  public sendEvent(type: string, action: string, identifiers: Map<string, string>, data: Map<string, any>): void {
    const identifiersWithVuid = new Map(identifiers);

    if (!identifiers.has(ODP_USER_KEY.VUID)) {
      if (this.vuid) {
        identifiersWithVuid.set(ODP_USER_KEY.VUID, this.vuid);
      } else {
        throw new Error(ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_VUID_MISSING);
      }
    }

    super.sendEvent(type, action, identifiersWithVuid, data);
  }
}
