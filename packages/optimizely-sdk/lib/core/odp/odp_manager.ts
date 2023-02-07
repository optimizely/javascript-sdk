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

import { LOG_MESSAGES } from './../../utils/enums/index';
import { RequestHandler } from './../../utils/http_request_handler/http';
import { BrowserLRUCacheConfig } from './../../utils/lru_cache/browser_lru_cache';
import { LRUCache } from './../../utils/lru_cache/lru_cache';
import { ERROR_MESSAGES, ODP_USER_KEY } from '../../utils/enums';

import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { OdpConfig } from './odp_config';
import { OdpEventManager } from './odp_event_manager';
import { OdpSegmentManager } from './odp_segment_manager';
import { OdpSegmentApiManager } from './odp_segment_api_manager';
import { OdpEventApiManager } from './odp_event_api_manager';
import { OptimizelySegmentOption } from './optimizely_segment_option';
import { areOdpDataTypesValid } from './odp_types';
import { OdpEvent } from './odp_event';

// Orchestrates segments manager, event manager, and ODP configuration
export class OdpManager {
  static MODULE_NAME = 'OdpManager';

  enabled: boolean;
  odpConfig: OdpConfig;
  logger: LogHandler;

  // Note: VuidManager only utilized in Browser variation at /plugins/odp_manager/index.browser.ts

  /**
   * ODP Segment Manager which provides an interface to the remote ODP server (GraphQL API) for audience segments mapping.
   * It fetches all qualified segments for the given user context and manages the segments cache for all user contexts.
   * @private
   */
  private _segmentManager: OdpSegmentManager | null;

  /**
   * Getter to retrieve the ODP segment manager.
   * @public
   */
  public get segmentManager(): OdpSegmentManager | null {
    return this._segmentManager;
  }

  /**
   * ODP Event Manager which provides an interface to the remote ODP server (REST API) for events.
   * It will queue all pending events (persistent) and send them (in batches of up to 10 events) to the ODP server when possible.
   * @private
   */
  private _eventManager: OdpEventManager | null;

  /**
   * Getter to retrieve the ODP event manager.
   * @public
   */
  public get eventManager(): OdpEventManager | null {
    return this._eventManager;
  }

  constructor(
    disable: boolean,
    requestHandler: RequestHandler,
    logger?: LogHandler,
    segmentsCache?: LRUCache<string, string[]>,
    segmentManager?: OdpSegmentManager,
    eventManager?: OdpEventManager,
    clientEngine?: string,
    clientVersion?: string
  ) {
    this.enabled = !disable;
    this.odpConfig = new OdpConfig();
    this.logger = logger || getLogger(OdpManager.MODULE_NAME);

    this._segmentManager = segmentManager || null;
    this._eventManager = eventManager || null;

    if (!this.enabled) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED);
      return;
    }

    // Set up Segment Manager (Audience Segments GraphQL API Interface)
    if (this._segmentManager) {
      this._segmentManager.odpConfig = this.odpConfig;
    } else {
      this._segmentManager = new OdpSegmentManager(
        this.odpConfig,
        segmentsCache ||
          new LRUCache({
            maxSize: BrowserLRUCacheConfig.DEFAULT_CAPACITY,
            timeout: BrowserLRUCacheConfig.DEFAULT_TIMEOUT_SECS,
          }),
        new OdpSegmentApiManager(requestHandler, this.logger)
      );
    }

    // Set up Events Manager (Events REST API Interface)
    if (this._eventManager) {
      this._eventManager.updateSettings(this.odpConfig);
    } else {
      this._eventManager = new OdpEventManager({
        odpConfig: this.odpConfig,
        apiManager: new OdpEventApiManager(requestHandler, this.logger),
        logger: this.logger,
        clientEngine: clientEngine || 'javascript-sdk',
        clientVersion: clientVersion || '4.9.2',
      });
    }

    this._eventManager.start();
  }

  /**
   * Provides a method to update ODP Manager's ODP Config API Key, API Host, and Audience Segments
   * @param apiKey Public API key for the ODP account
   * @param apiHost Host of ODP APIs for Audience Segments and Events
   * @param segmentsToCheck List of audience segments included in the new ODP Config
   */
  public updateSettings(apiKey?: string, apiHost?: string, segmentsToCheck?: string[]): boolean {
    if (!this.enabled) return false;

    const configChanged = this.odpConfig.update(apiKey, apiHost, segmentsToCheck);

    if (configChanged) {
      this._eventManager?.updateSettings(this.odpConfig);
      this._segmentManager?.reset();
      this._segmentManager?.updateSettings(this.odpConfig);
      return true;
    }

    return false;
  }

  /**
   * Attempts to stop the current instance of ODP Manager's event manager, if it exists and is running.
   */
  public close(): void {
    this._eventManager?.stop();
  }

  /**
   * Attempts to fetch and return a list of a user's qualified segments from the local segments cache.
   * If no cached data exists for the target user, this fetches and caches data from the ODP server instead.
   * @param {ODP_USER_KEY}                    userKey - Identifies the user id type.
   * @param {string}                          userId  - Unique identifier of a target user.
   * @param {Array<OptimizelySegmentOption}   options - An array of OptimizelySegmentOption used to ignore and/or reset the cache.
   * @returns {Promise<string[] | null>}      A promise holding either a list of qualified segments or null.
   */
  public async fetchQualifiedSegments(
    userKey: ODP_USER_KEY,
    userId: string,
    options: Array<OptimizelySegmentOption>
  ): Promise<string[] | null> {
    if (!this.enabled || !this._segmentManager) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED);
      return null;
    }

    return this._segmentManager.fetchQualifiedSegments(userKey, userId, options);
  }

  /**
   * Identifies a user via the ODP Event Manager
   * @param userId Unique identifier of a target user.
   * @param vuid Automatically generated unique user identifier (for client-sdks only)
   * @returns
   */
  public identifyUser(userId: string, vuid?: string): void {
    if (!this.enabled || !this._eventManager) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED);
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_NOT_INTEGRATED);
      return;
    }

    this._eventManager.identifyUser(userId, vuid);
  }

  /**
   * Sends an event to the ODP Server via the ODP Events API
   * @param type The event type
   * @param action The event action name
   * @param identifiers A map of identifiers
   * @param data A map of associated data; default event data will be included here before sending to ODP
   */
  public sendEvent(type: string, action: string, identifiers: Map<string, string>, data: Map<string, any>): void {
    if (!this.enabled || !this._eventManager) {
      throw new Error('ODP Not Enabled');
    }

    if (!this.odpConfig.isReady()) {
      throw new Error('ODP Not Integrated');
    }

    if (!areOdpDataTypesValid(data)) {
      throw new Error('ODP Data Invalid');
    }

    this._eventManager.sendEvent(new OdpEvent(type, action, identifiers, data));
  }
}
