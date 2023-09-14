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
import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { ERROR_MESSAGES, ODP_USER_KEY } from '../../utils/enums';

import { VuidManager } from '../../plugins/vuid_manager';

import { OdpConfig } from './odp_config';
import { IOdpEventManager } from './odp_event_manager';
import { IOdpSegmentManager } from './odp_segment_manager';
import { OptimizelySegmentOption } from './optimizely_segment_option';
import { invalidOdpDataFound } from './odp_utils';
import { OdpEvent } from './odp_event';

const ODP_CONFIG_INVALID = "ODP Configuration is not valid";

/**
 * Manager for handling internal all business logic related to
 * Optimizely Data Platform (ODP) / Advanced Audience Targeting (AAT)
 */
export interface IOdpManager {
  initPromise?: Promise<void>;

  enabled: boolean;

  segmentManager: IOdpSegmentManager | undefined;

  eventManager: IOdpEventManager | undefined;

  updateSettings(config: OdpConfig): boolean;

  close(): void;

  fetchQualifiedSegments(userId: string, options?: Array<OptimizelySegmentOption>): Promise<string[] | null>;

  identifyUser(userId?: string, vuid?: string): void;

  sendEvent({ type, action, identifiers, data }: OdpEvent): void;

  isVuidEnabled(): boolean;

  getVuid(): string | undefined;
}

/**
 * Orchestrates segments manager, event manager, and ODP configuration
 */
export abstract class OdpManager implements IOdpManager {
  /**
   * Promise that returns when the OdpManager is finished initializing
   */
  initPromise?: Promise<void>;

  /**
   * Switch to enable/disable ODP Manager functionality
   */
  enabled = true;

  /**
   * ODP Segment Manager which provides an interface to the remote ODP server (GraphQL API) for audience segments mapping.
   * It fetches all qualified segments for the given user context and manages the segments cache for all user contexts.
   */
  segmentManager: IOdpSegmentManager | undefined;

  /**
   * ODP Event Manager which provides an interface to the remote ODP server (REST API) for events.
   * It will queue all pending events (persistent) and send them (in batches of up to 10 events) to the ODP server when possible.
   */
  eventManager: IOdpEventManager | undefined;

  /**
   * Handler for recording execution logs
   */
  protected logger: LogHandler;

  /**
   * ODP configuration settings for identifying the target API and segments
   */
  private _odpConfig: OdpConfig;
  public get odpConfig(): OdpConfig {
    return this._odpConfig;
  }

  constructor(config?: OdpConfig, logger?: LogHandler) {
    this.logger = logger ?? getLogger();
    this._odpConfig = config ?? new OdpConfig();

    if (!config?.isValid()) {
      this.logger.log(LogLevel.WARNING, ODP_CONFIG_INVALID);
    }
  }

  /**
   * Provides a method to update ODP Manager's ODP Config API Key, API Host, and Audience Segments
   */
  updateSettings(config: OdpConfig): boolean {
    if (!config.isValid()) {
      this.logger.log(LogLevel.WARNING, ODP_CONFIG_INVALID);
      return false;
    }

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

    this._odpConfig = config;

    this.segmentManager?.updateSettings(config);

    return true;
  }

  /**
   * Attempts to stop the current instance of ODP Manager's event manager, if it exists and is running.
   */
  close(): void {
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
  async fetchQualifiedSegments(userId: string, options: Array<OptimizelySegmentOption> = []): Promise<string[] | null> {
    if (!this.odpConfig) {
      this.logger.log(LogLevel.WARNING, ODP_CONFIG_INVALID);
      return null;
    }

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
  identifyUser(userId?: string, vuid?: string): void {
    if (!this.odpConfig) {
      this.logger.log(LogLevel.WARNING, ODP_CONFIG_INVALID);
      return;
    }

    if (!this.enabled) {
      this.logger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED);
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
  sendEvent({ type, action, identifiers, data }: OdpEvent): void {
    let mType = type;

    if (typeof mType !== 'string' || mType === '') {
      mType = 'fullstack';
    }

    if (!this.enabled) {
      throw new Error(ERROR_MESSAGES.ODP_NOT_ENABLED);
    }

    if (invalidOdpDataFound(data)) {
      throw new Error(ERROR_MESSAGES.ODP_INVALID_DATA);
    }

    if (!this.eventManager) {
      throw new Error(ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_EVENT_MANAGER_MISSING);
    }

    if (typeof action !== 'string' || action === '') {
      throw new Error('ODP action is not valid (cannot be empty).');
    }

    this.eventManager.sendEvent(new OdpEvent(mType, action, identifiers, data));
  }

  /**
   * Identifies if the VUID feature is enabled
   */
  abstract isVuidEnabled(): boolean;

  /**
   * Returns VUID value if it exists
   */
  abstract getVuid(): string | undefined;
}
