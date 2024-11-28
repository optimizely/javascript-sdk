/**
 * Copyright 2022-2024, Optimizely
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

import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { ERROR_MESSAGES } from '../../utils/enums';
import { ICache } from '../../utils/lru_cache';
import { IOdpSegmentApiManager } from './odp_segment_api_manager';
import { OdpConfig, OdpIntegrationConfig } from '../odp_config';
import { OptimizelySegmentOption } from './optimizely_segment_option';
import { BaseService, Service } from '../../service';
import { ODP_IDENTIFIER_KEY } from '../constant';

export interface OdpSegmentManager extends Service {
  fetchQualifiedSegments(
    identifierKey: ODP_IDENTIFIER_KEY,
    identifier: string,
    options: Array<OptimizelySegmentOption>
  ): Promise<string[] | null>;
  resetCache(): void;
  updateSettings(config: OdpIntegrationConfig): void;
}

export class DefaultSegmentManager extends BaseService implements OdpSegmentManager {
  private odpIntegrationConfig?: OdpIntegrationConfig;

  /**
   * Holds cached audience segments
   * @private
   */
  private _segmentsCache: ICache<string, string[]>;

  /**
   * Getter for private segments cache
   * @public
   */
  get segmentsCache(): ICache<string, string[]> {
    return this._segmentsCache;
  }

  /**
   * GraphQL API Manager used to fetch segments
   * @private
   */
  private odpSegmentApiManager: IOdpSegmentApiManager;

  /**
   * Handler for recording execution logs
   * @private
   */
  private readonly logger: LogHandler;

  constructor(
    segmentsCache: ICache<string, string[]>,
    odpSegmentApiManager: IOdpSegmentApiManager,
    logger?: LogHandler,
    odpConfig?: OdpConfig,
  ) {
    this.odpIntegrationConfig = odpConfig;
    this._segmentsCache = segmentsCache;
    this.odpSegmentApiManager = odpSegmentApiManager;
    this.logger = logger || getLogger('OdpSegmentManager');
  }

  /**
   * Attempts to fetch and return a list of a user's qualified segments from the local segments cache.
   * If no cached data exists for the target user, this fetches and caches data from the ODP server instead.
   * @param userKey Key used for identifying the id type.
   * @param userValue The id value itself.
   * @param options An array of OptimizelySegmentOption used to ignore and/or reset the cache.
   * @returns Qualified segments for the user from the cache or the ODP server if the cache is empty.
   */
  async fetchQualifiedSegments(
    userKey: ODP_USER_KEY,
    userValue: string,
    options: Array<OptimizelySegmentOption>
  ): Promise<string[] | null> {
    if (!this.odpIntegrationConfig) {
      this.logger.log(LogLevel.WARNING, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
      return null;      
    }

    const segmentsToCheck = this.odpIntegrationConfig.segmentsToCheck;
    if (!segmentsToCheck || segmentsToCheck.length <= 0) {
      this.logger.log(LogLevel.DEBUG, 'No segments are used in the project. Returning an empty list.');
      return [];
    }

    const cacheKey = this.makeCacheKey(userKey, userValue);

    const ignoreCache = options.includes(OptimizelySegmentOption.IGNORE_CACHE);
    const resetCache = options.includes(OptimizelySegmentOption.RESET_CACHE);

    if (resetCache) {
      this.resetCache();
    }

    if (!ignoreCache && !resetCache) {
      const cachedSegments = this._segmentsCache.lookup(cacheKey);
      if (cachedSegments) {
        this.logger.log(LogLevel.DEBUG, 'ODP cache hit. Returning segments from cache "%s".', cacheKey);
        return cachedSegments;
      }
      this.logger.log(LogLevel.DEBUG, `ODP cache miss.`);
    }

    this.logger.log(LogLevel.DEBUG, `Making a call to ODP server.`);

    const segments = await this.odpSegmentApiManager.fetchSegments(
      this.odpIntegrationConfig.apiKey,
      this.odpIntegrationConfig.apiHost,
      userKey,
      userValue,
      segmentsToCheck
    );

    if (segments && !ignoreCache) {
      this._segmentsCache.save({ key: cacheKey, value: segments });
    }

    return segments;
  }

  /**
   * Clears the segments cache
   */
  resetCache(): void {
    this._segmentsCache.reset();
  }

  /**
   * Creates a key used to identify which user fetchQualifiedSegments should lookup and save to in the segments cache
   * @param userKey User type based on ODP_USER_KEY, such as "vuid" or "fs_user_id"
   * @param userValue Arbitrary string, such as "test-user"
   * @returns Concatenates inputs and returns the string "{userKey}-$-{userValue}"
   */
  makeCacheKey(userKey: string, userValue: string): string {
    return `${userKey}-$-${userValue}`;
  }

  /**
   * Updates the ODP Config settings of ODP Segment Manager
   * @param config New ODP Config that will overwrite the existing config
   */
  updateSettings(config: OdpIntegrationConfig): void {
    this.odpIntegrationConfig = config;
    this.resetCache();
  }
}
