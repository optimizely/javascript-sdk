/**
 * Copyright 2022, Optimizely
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
import { ERROR_MESSAGES, ODP_USER_KEY } from '../../utils/enums';
import { LRUCache } from './../../core/odp/lru_cache/LRUCache';
import { GraphQLManager as OdpSegmentApiManager } from './graphql_manager';
import { OdpConfig } from './odp_config';
import { OptimizelySegmentOption } from './optimizely_segment_option';

// Schedules connections to ODP for audience segmentation and caches the results.
export class OdpSegmentManager {
  odpConfig: OdpConfig;
  segmentsCache: LRUCache<string, Array<string>>;
  odpSegmentApiManager: OdpSegmentApiManager;
  logger: LogHandler;

  constructor(
    odpConfig: OdpConfig,
    segmentsCache: LRUCache<string, Array<string>>,
    odpSegmentApiManager: OdpSegmentApiManager,
    logger?: LogHandler
  ) {
    this.odpConfig = odpConfig;
    this.segmentsCache = segmentsCache;
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
  ): Promise<Array<string> | null> {
    const { apiHost: odpApiHost, apiKey: odpApiKey } = this.odpConfig;

    if (!odpApiKey || !odpApiHost) {
      this.logger.log(LogLevel.WARNING, ERROR_MESSAGES.FETCH_SEGMENTS_FAILED_INVALID_IDENTIFIER);
      return null;
    }

    const segmentsToCheck = this.odpConfig.segmentsToCheck;
    if (!segmentsToCheck || segmentsToCheck.length <= 0) {
      this.logger.log(LogLevel.DEBUG, 'No segments are used in the project. Returning an empty list.');
      return [];
    }

    const cacheKey = this.makeCacheKey(userKey, userValue);

    const ignoreCache = options.includes(OptimizelySegmentOption.IGNORE_CACHE);
    const resetCache = options.includes(OptimizelySegmentOption.RESET_CACHE);

    if (resetCache) this.reset();

    if (!ignoreCache && !resetCache) {
      const cachedSegments = this.segmentsCache.lookup(cacheKey);
      if (cachedSegments) {
        this.logger.log(LogLevel.DEBUG, 'ODP cache hit. Returning segments from cache "%s".', cacheKey);
        return cachedSegments;
      }
      this.logger.log(LogLevel.DEBUG, `ODP cache miss.`);
    }

    this.logger.log(LogLevel.DEBUG, `Making a call to ODP server.`);

    const segments = await this.odpSegmentApiManager.fetchSegments(
      odpApiKey,
      odpApiHost,
      userKey,
      userValue,
      segmentsToCheck
    );

    if (segments && !ignoreCache) this.segmentsCache.save({ key: cacheKey, value: segments });

    return segments;
  }

  /**
   * Clears the segments cache
   */
  reset(): void {
    this.segmentsCache.reset();
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
}
