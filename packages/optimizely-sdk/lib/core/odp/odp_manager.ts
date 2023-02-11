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

import { LOG_MESSAGES } from './../../utils/enums/index';
import { RequestHandler } from './../../utils/http_request_handler/http';
import PersistentKeyValueCache from '../../plugins/key_value_cache/persistentKeyValueCache';
import { BrowserLRUCache } from './../../utils/lru_cache/browser_lru_cache';
import { LRUCache } from './../../utils/lru_cache/lru_cache';
import { ERROR_MESSAGES, ODP_USER_KEY } from '../../utils/enums';

import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { OdpConfig } from './odp_config';
import { OdpEventManager } from './odp_event_manager';
import { OdpSegmentManager } from './odp_segment_manager';
import { OdpSegmentApiManager } from './odp_segment_api_manager';
import { OdpEventApiManager } from './odp_event_api_manager';
import { OptimizelySegmentOption } from './optimizely_segment_option';
import { invalidOdpDataFound } from './odp_utils';
import { OdpEvent } from './odp_event';

/**
 * @param disable Flag for disabling ODP Manager.
 * @param requestHandler HTTP request handler that will be used by Segment and Event Managers.
 * @param logger (Optional) Accepts custom LogHandler. Defaults to the default LogHandler.
 * @param clientEngine (Optional) String denoting specific client engine being used. Defaults to 'javascript-sdk'.
 * @param clientVersion (Optional) String denoting specific client version. Defaults to current version value from package.json.
 * @param segmentsCache (Optional) Accepts a custom LRUCache. Defaults to BrowserLRUCache.
 * @param segmentManager (Optional) Accepts a custom ODPSegmentManager.
 * @param eventManager (Optional) Accepts a custom ODPEventManager.
 */
interface ODPManagerConfig {
  disable: boolean;
  requestHandler: RequestHandler;
  logger?: LogHandler;
  clientEngine?: string;
  clientVersion?: string;
  odpConfig?: OdpConfig;
  segmentsCache?: LRUCache<string, string[]>;
  eventManager?: OdpEventManager;
  segmentManager?: OdpSegmentManager;
}

/**
 * Orchestrates segments manager, event manager, and ODP configuration
 */
export class OdpManager {
  enabled: boolean;
  logger: LogHandler;
  odpConfig!: OdpConfig;

  /**
   * ODP Segment Manager which provides an interface to the remote ODP server (GraphQL API) for audience segments mapping.
   * It fetches all qualified segments for the given user context and manages the segments cache for all user contexts.
   * @private
   */
  private _segmentManager!: OdpSegmentManager;

  public get segmentManager(): OdpSegmentManager {
    return this._segmentManager;
  }

  /**
   * ODP Event Manager which provides an interface to the remote ODP server (REST API) for events.
   * It will queue all pending events (persistent) and send them (in batches of up to 10 events) to the ODP server when possible.
   */
  eventManager!: OdpEventManager;

  constructor({
    disable,
    requestHandler,
    logger,
    clientEngine,
    clientVersion,
    odpConfig,
    segmentsCache,
    eventManager,
    segmentManager,
  }: ODPManagerConfig) {
    this.enabled = !disable;
    this.logger = logger || getLogger();

    if (!this.enabled) {
      this.logger.log(LogLevel.INFO, ERROR_MESSAGES.ODP_NOT_ENABLED);
      return;
    }

    this.odpConfig = odpConfig || new OdpConfig();

    // Set up Segment Manager (Audience Segments GraphQL API Interface)

    if (segmentManager) {
      this._segmentManager = segmentManager;
      this._segmentManager.odpConfig = this.odpConfig;
    } else {
      this._segmentManager = new OdpSegmentManager(
        this.odpConfig,
        segmentsCache || new BrowserLRUCache<string, string[]>(),
        new OdpSegmentApiManager(requestHandler, this.logger)
      );
    }

    // Set up Events Manager (Events REST API Interface)
    if (eventManager) {
      this.eventManager = eventManager;
      this.eventManager.updateSettings(this.odpConfig);
    } else {
      this.eventManager = new OdpEventManager({
        odpConfig: this.odpConfig,
        apiManager: new OdpEventApiManager(requestHandler, this.logger),
        logger: this.logger,
        clientEngine: clientEngine || 'javascript-sdk',
        clientVersion: clientVersion || packageJSON.version,
      });
    }

    this.eventManager.start();
  }

  /**
   * Provides a method to update ODP Manager's ODP Config API Key, API Host, and Audience Segments
   * @param apiKey Public API key for the ODP account
   * @param apiHost Host of ODP APIs for Audience Segments and Events
   * @param segmentsToCheck List of audience segments included in the new ODP Config
   */
  public updateSettings({ apiKey, apiHost, segmentsToCheck }: OdpConfig): boolean {
    if (!this.enabled) {
      return false;
    }

    const newConfig = new OdpConfig(apiKey, apiHost, segmentsToCheck);
    const configDidUpdate = this.odpConfig.update(newConfig);

    if (configDidUpdate) {
      this.odpConfig = newConfig;
      this.eventManager.updateSettings(this.odpConfig);
      this._segmentManager.reset();
      this._segmentManager.updateSettings(this.odpConfig);
      return true;
    }

    return false;
  }

  /**
   * Attempts to stop the current instance of ODP Manager's event manager, if it exists and is running.
   */
  public close(): void {
    this.eventManager.stop();
  }

  /**
   * Attempts to fetch and return a list of a user's qualified segments from the local segments cache.
   * If no cached data exists for the target user, this fetches and caches data from the ODP server instead.
   * @param {ODP_USER_KEY}                    userKey - Identifies the user id type.
   * @param {string}                          userId  - Unique identifier of a target user.
   * @param {Array<OptimizelySegmentOption>}   options - An array of OptimizelySegmentOption used to ignore and/or reset the cache.
   * @returns {Promise<string[] | null>}      A promise holding either a list of qualified segments or null.
   */
  public async fetchQualifiedSegments(
    userKey: ODP_USER_KEY,
    userId: string,
    options: Array<OptimizelySegmentOption> = []
  ): Promise<string[] | null> {
    if (!this.enabled) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED);
      return null;
    }

    return this._segmentManager.fetchQualifiedSegments(userKey, userId, options);
  }

  /**
   * Identifies a user via the ODP Event Manager
   * @param userId Unique identifier of a target user.
   * @returns
   */
  public identifyUser(userId: string): void {
    if (!this.enabled) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED);
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_NOT_INTEGRATED);
      return;
    }

    this.eventManager.identifyUser(userId);
  }

  /**
   * Sends an event to the ODP Server via the ODP Events API
   * @param type The event type
   * @param action The event action name
   * @param identifiers A map of identifiers
   * @param data A map of associated data; default event data will be included here before sending to ODP
   */
  public sendEvent(type: string, action: string, identifiers: Map<string, string>, data: Map<string, any>): void {
    if (!this.enabled) {
      throw new Error(ERROR_MESSAGES.ODP_NOT_ENABLED);
    }

    if (!this.odpConfig.isReady()) {
      throw new Error(ERROR_MESSAGES.ODP_NOT_INTEGRATED);
    }

    if (invalidOdpDataFound(data)) {
      throw new Error(ERROR_MESSAGES.ODP_INVALID_DATA);
    }

    this.eventManager.sendEvent(new OdpEvent(type, action, identifiers, data));
  }
}
