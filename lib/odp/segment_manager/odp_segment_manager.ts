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

import { ERROR_MESSAGES } from '../../utils/enums';
import { Cache } from '../../utils/cache/cache';
import { OdpSegmentApiManager } from './odp_segment_api_manager';
import { OdpIntegrationConfig } from '../odp_config';
import { OptimizelySegmentOption } from './optimizely_segment_option';
import { ODP_USER_KEY } from '../constant';
import { LoggerFacade } from '../../modules/logging';

export interface OdpSegmentManager {
  fetchQualifiedSegments(
    userKey: ODP_USER_KEY,
    user: string,
    options: Array<OptimizelySegmentOption>
  ): Promise<string[] | null>;
  updateConfig(config: OdpIntegrationConfig): void;
}

export class DefaultSegmentManager implements OdpSegmentManager {
  private odpIntegrationConfig?: OdpIntegrationConfig;
  private segmentsCache: Cache<string[]>;
  private odpSegmentApiManager: OdpSegmentApiManager
  private logger?: LoggerFacade;

  constructor(
    segmentsCache: Cache<string[]>,
    odpSegmentApiManager: OdpSegmentApiManager,
    logger?: LoggerFacade,
  ) {
    this.segmentsCache = segmentsCache;
    this.odpSegmentApiManager = odpSegmentApiManager;
    this.logger = logger;
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
      this.logger?.warn(ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
      return null;      
    }

    if (!this.odpIntegrationConfig.integrated) {
      this.logger?.warn(ERROR_MESSAGES.ODP_NOT_INTEGRATED);
      return null;
    }

    const odpConfig = this.odpIntegrationConfig.odpConfig;

    const segmentsToCheck = odpConfig.segmentsToCheck;
    if (!segmentsToCheck || segmentsToCheck.length <= 0) {
      return [];
    }

    const cacheKey = this.makeCacheKey(userKey, userValue);

    const ignoreCache = options.includes(OptimizelySegmentOption.IGNORE_CACHE);
    const resetCache = options.includes(OptimizelySegmentOption.RESET_CACHE);

    if (resetCache) {
      this.segmentsCache.clear();
    }

    if (!ignoreCache) {
      const cachedSegments = await this.segmentsCache.get(cacheKey);
      if (cachedSegments) {
        return cachedSegments;
      }
    }

    const segments = await this.odpSegmentApiManager.fetchSegments(
      odpConfig.apiKey,
      odpConfig.apiHost,
      userKey,
      userValue,
      segmentsToCheck
    );

    if (segments && !ignoreCache) {
      this.segmentsCache.set(cacheKey, segments);
    }

    return segments;
  }

  makeCacheKey(userKey: string, userValue: string): string {
    return `${userKey}-$-${userValue}`;
  }

  updateConfig(config: OdpIntegrationConfig): void {
    this.odpIntegrationConfig = config;
    this.segmentsCache.clear();
  }
}
