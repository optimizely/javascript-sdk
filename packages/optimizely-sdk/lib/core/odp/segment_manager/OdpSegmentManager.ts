/**
 * Copyright 2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ODP_USER_KEY, ERROR_MESSAGES } from './../../../utils/enums/index';
import { getLogger } from '@optimizely/js-sdk-logging';
import { LRUCache } from './../lru_cache/LRUCache';
import { GraphQLManager } from '../../../../lib/plugins/odp/graphql_manager';
import { OdpConfig } from '../OdpConfig';
import { OptimizelyOdpOption } from '../OdpOption';
import { LogHandler } from '../../../modules/logging';
import { LogLevel } from '../../../modules/logging/models';

// Schedules connections to ODP for audience segmentation and caches the results.
export class OdpSegmentManager {
  odpConfig: OdpConfig;
  segmentsCache: LRUCache<string, Array<string>>;
  zaiusManager: GraphQLManager;
  logger: LogHandler;

  constructor(
    odpConfig: OdpConfig,
    segmentsCache: LRUCache<string, Array<string>>,
    zaiusManager: GraphQLManager,
    logger?: LogHandler
  ) {
    this.odpConfig = odpConfig;
    this.segmentsCache = segmentsCache;
    this.zaiusManager = zaiusManager;
    this.logger = logger || getLogger('OdpSegmentManager');
  }

  /**
   * Attempts to fetch and return a list of the user's qualified segments.
   * @param userKey Key used for identifying the id type.
   * @param userValue The id value itself.
   * @param options An array of OptimizelySegmentOption used to ignore and/or reset the cache.
   * @returns Qualified segments for the user from the cache or the ODP server if the cache is empty.
   */
  async fetchQualifiedSegments(
    userKey: ODP_USER_KEY,
    userValue: string,
    options: Array<OptimizelyOdpOption>
  ): Promise<Array<string> | null> {
    const odpApiHost = this.odpConfig.apiHost;
    const odpApiKey = this.odpConfig.apiKey;

    if (!odpApiKey || !odpApiHost) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.FETCH_SEGMENTS_FAILED);
      return null;
    }

    const segmentsToCheck = this.odpConfig.segmentsToCheck;
    if (!segmentsToCheck || segmentsToCheck.length <= 0) {
      this.logger.log(LogLevel.DEBUG, 'No segments are used in the project. Returning an empty list.');
      return [];
    }

    const cacheKey = this.makeCacheKey(userKey, userValue);

    const ignoreCache = options.includes(OptimizelyOdpOption.IGNORE_CACHE);
    const resetCache = options.includes(OptimizelyOdpOption.RESET_CACHE);

    if (resetCache) this.reset();

    if (!ignoreCache && !resetCache) {
      const cachedSegments = this.segmentsCache.lookup(cacheKey);
      if (cachedSegments) {
        this.logger.log(LogLevel.DEBUG, `ODP cache hit. Returning segments from cache "${cacheKey}".`);
        return cachedSegments;
      }
      this.logger.log(LogLevel.DEBUG, `ODP cache miss.`);
    }

    this.logger.log(LogLevel.DEBUG, `Making a call to ODP server.`);

    const segments = await this.zaiusManager.fetchSegments(odpApiKey, odpApiHost, userKey, userValue, segmentsToCheck);

    if (segments && !ignoreCache) this.segmentsCache.save({ key: cacheKey, value: segments });

    return segments;
  }

  reset(): void {
    this.segmentsCache.reset();
  }

  makeCacheKey(userKey: string, userValue: string): string {
    return `${userKey}-$-${userValue}`;
  }
}
