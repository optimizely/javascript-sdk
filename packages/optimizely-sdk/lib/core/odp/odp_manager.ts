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

import { BROWSER_CLIENT_VERSION, LOG_MESSAGES } from './../../utils/enums/index';
import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { ERROR_MESSAGES, ODP_USER_KEY } from '../../utils/enums';

import { RequestHandler } from './../../utils/http_request_handler/http';

import { LRUCache } from './../../utils/lru_cache/lru_cache';

import { VuidManager } from '../../plugins/vuid_manager';

import { OdpConfig } from './odp_config';
import { OdpEventManager } from './odp_event_manager';
import { OdpSegmentManager } from './odp_segment_manager';
import { OdpSegmentApiManager } from './odp_segment_api_manager';
import { OptimizelySegmentOption } from './optimizely_segment_option';
import { invalidOdpDataFound } from './odp_utils';
import { OdpEvent } from './odp_event';
import { OdpOptions } from '../../shared_types';

/**
 * @param {LRUCache<string, string>[]}  segmentLRUCache Cache to be used for storing segments.
 * @param {RequestHandler}              segmentRequestHandler HTTP request handler that will be used by the ODP Segment Manager.
 * @param {RequestHandler}              eventRequestHandler HTTP request handler that will be used by the ODP Event Manager.
 * @param {LogHandler}                  logger (Optional) Accepts custom LogHandler. Defaults to the default global LogHandler.
 * @param {string}                      clientEngine (Optional) String denoting specific client engine being used. Defaults to 'javascript-sdk'.
 * @param {string}                      clientVersion (Optional) String denoting specific client version. Defaults to current version value from package.json.
 * @param {OdpOptions}                  odpOptions (Optional) Configuration settings for various ODP options from segment cache size to event flush interval.
 */
interface OdpManagerConfig {
  segmentLRUCache: LRUCache<string, string[]>;
  segmentRequestHandler: RequestHandler;
  eventRequestHandler: RequestHandler;
  logger?: LogHandler;
  clientEngine?: string;
  clientVersion?: string;
  odpOptions?: OdpOptions;
}

/**
 * Orchestrates segments manager, event manager, and ODP configuration
 */
export abstract class OdpManager {
  enabled: boolean;
  logger: LogHandler;
  odpConfig: OdpConfig = new OdpConfig();

  /**
   * ODP Segment Manager which provides an interface to the remote ODP server (GraphQL API) for audience segments mapping.
   * It fetches all qualified segments for the given user context and manages the segments cache for all user contexts.
   */
  public segmentManager: OdpSegmentManager | undefined;

  /**
   * ODP Event Manager which provides an interface to the remote ODP server (REST API) for events.
   * It will queue all pending events (persistent) and send them (in batches of up to 10 events) to the ODP server when possible.
   */
  public eventManager: OdpEventManager | undefined;

  constructor({ segmentLRUCache, segmentRequestHandler, logger, odpOptions }: OdpManagerConfig) {
    this.enabled = !odpOptions?.disabled;
    this.logger = logger || getLogger();

    if (!this.enabled) {
      this.logger.log(LogLevel.INFO, LOG_MESSAGES.ODP_DISABLED);
      return;
    }

    // Set up Segment Manager (Audience Segments GraphQL API Interface)
    if (odpOptions?.segmentManager) {
      this.segmentManager = odpOptions.segmentManager;
      this.segmentManager.updateSettings(this.odpConfig);
    } else {
      this.segmentManager = new OdpSegmentManager(
        this.odpConfig,
        segmentLRUCache,
        new OdpSegmentApiManager(segmentRequestHandler, this.logger)
      );
    }
  }

  /**
   * Provides a method to update ODP Manager's ODP Config API Key, API Host, and Audience Segments
   */
  public updateSettings({ apiKey, apiHost, segmentsToCheck }: OdpConfig): boolean {
    if (!this.enabled) {
      return false;
    }

    if (!this.eventManager) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_MANAGER_UPDATE_SETTINGS_FAILED_EVENT_MANAGER_MISSING);
      return false;
    }

    if (!this.segmentManager) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_MANAGER_UPDATE_SETTINGS_FAILED_SEGMENTS_MANAGER_MISSING);
      return false;
    }

    this.eventManager.flush();

    const newConfig = new OdpConfig(apiKey, apiHost, segmentsToCheck);
    const configDidUpdate = this.odpConfig.update(newConfig);

    if (configDidUpdate) {
      this.odpConfig.update(newConfig);
      this.segmentManager?.reset();
      return true;
    }

    return false;
  }

  /**
   * Attempts to stop the current instance of ODP Manager's event manager, if it exists and is running.
   */
  public close(): void {
    if (!this.enabled) {
      return;
    }

    this.eventManager?.stop();
  }

  /**
   * Attempts to fetch and return a list of a user's qualified segments from the local segments cache.
   * If no cached data exists for the target user, this fetches and caches data from the ODP server instead.
   * @param {string}                          userId  - Unique identifier of a target user.
   * @param {Array<OptimizelySegmentOption>}  options - An array of OptimizelySegmentOption used to ignore and/or reset the cache.
   * @returns {Promise<string[] | null>}      A promise holding either a list of qualified segments or null.
   */
  public async fetchQualifiedSegments(
    userId: string,
    options: Array<OptimizelySegmentOption> = []
  ): Promise<string[] | null> {
    if (!this.enabled) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED);
      return null;
    }

    if (!this.segmentManager) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_FETCH_QUALIFIED_SEGMENTS_SEGMENTS_MANAGER_MISSING);
      return null;
    }

    if (VuidManager.isVuid(userId)) {
      return this.segmentManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, userId, options);
    }

    return this.segmentManager.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, userId, options);
  }

  /**
   * Identifies a user via the ODP Event Manager
   * @param {string}  userId    (Optional) Custom unique identifier of a target user.
   * @param {string}  vuid      (Optional) Secondary unique identifier of a target user, primarily used by client SDKs.
   * @returns
   */
  public identifyUser(userId?: string, vuid?: string): void {
    if (!this.enabled) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED);
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_NOT_INTEGRATED);
      return;
    }

    if (!this.eventManager) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_IDENTIFY_FAILED_EVENT_MANAGER_MISSING);
      return;
    }

    if (userId && VuidManager.isVuid(userId)) {
      this.eventManager.identifyUser(undefined, userId);
      return;
    }

    this.eventManager.identifyUser(userId, vuid);
  }

  /**
   * Sends an event to the ODP Server via the ODP Events API
   * @param {OdpEvent}  > ODP Event to send to event manager
   */
  public sendEvent({ type, action, identifiers, data }: OdpEvent): void {
    if (!this.enabled) {
      throw new Error(ERROR_MESSAGES.ODP_NOT_ENABLED);
    }

    if (!this.odpConfig.isReady()) {
      throw new Error(ERROR_MESSAGES.ODP_NOT_INTEGRATED);
    }

    if (invalidOdpDataFound(data)) {
      throw new Error(ERROR_MESSAGES.ODP_INVALID_DATA);
    }

    if (!this.eventManager) {
      throw new Error(ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_EVENT_MANAGER_MISSING);
    }

    this.eventManager.sendEvent(new OdpEvent(type, action, identifiers, data));
  }

  public abstract isVuidEnabled(): boolean;

  public abstract getVuid(): string | undefined;
}
