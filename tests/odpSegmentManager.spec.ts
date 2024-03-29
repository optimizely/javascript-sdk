/**
 * Copyright 2022-2023, Optimizely
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

/// <reference types="jest" />

import { mock, resetCalls, instance } from 'ts-mockito';

import { LogHandler } from '../lib/modules/logging';
import { ODP_USER_KEY } from '../lib/utils/enums';
import { RequestHandler } from '../lib/utils/http_request_handler/http';

import { OdpSegmentManager } from '../lib/core/odp/odp_segment_manager';
import { OdpConfig } from '../lib/core/odp/odp_config';
import { LRUCache } from '../lib/utils/lru_cache';
import { OptimizelySegmentOption } from './../lib/core/odp/optimizely_segment_option';
import { OdpSegmentApiManager } from '../lib/core/odp/odp_segment_api_manager';

describe('OdpSegmentManager', () => {
  class MockOdpSegmentApiManager extends OdpSegmentApiManager {
    async fetchSegments(
      apiKey: string,
      apiHost: string,
      userKey: ODP_USER_KEY,
      userValue: string,
      segmentsToCheck: string[]
    ): Promise<string[] | null> {
      if (apiKey == 'invalid-key') return null;
      return segmentsToCheck;
    }
  }

  const mockLogHandler = mock<LogHandler>();
  const mockRequestHandler = mock<RequestHandler>();

  const apiManager = new MockOdpSegmentApiManager(instance(mockRequestHandler), instance(mockLogHandler));

  let options: Array<OptimizelySegmentOption> = [];

  const userKey: ODP_USER_KEY = ODP_USER_KEY.VUID;
  const userValue = 'test-user';

  const validTestOdpConfig = new OdpConfig('valid-key', 'host', 'pixel-url', ['new-customer']);
  const invalidTestOdpConfig = new OdpConfig('invalid-key', 'host', 'pixel-url', ['new-customer']);

  const getSegmentsCache = () => {
    return new LRUCache<string, string[]>({
      maxSize: 1000,
      timeout: 1000,
    });
  }

  beforeEach(() => {
    resetCalls(mockLogHandler);
    resetCalls(mockRequestHandler);

    const API_KEY = 'test-api-key';
    const API_HOST = 'https://odp.example.com';
    const PIXEL_URL = 'https://odp.pixel.com';
  });

  it('should fetch segments successfully on cache miss.', async () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);
    setCache(manager, userKey, '123', ['a']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
  });

  it('should fetch segments successfully on cache hit.', async () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);
    setCache(manager, userKey, userValue, ['a']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['a']);
  });

  it('should return null when fetching segments returns an error.', async () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, invalidTestOdpConfig);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, []);
    expect(segments).toBeNull;
  });

  it('should ignore the cache if the option enum is included in the options array.', async () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);
    setCache(manager, userKey, userValue, ['a']);
    options = [OptimizelySegmentOption.IGNORE_CACHE];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(cacheCount(manager)).toBe(1);
  });

  it('should ignore the cache if the option string is included in the options array.', async () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);
    setCache(manager,userKey, userValue, ['a']);
    // @ts-ignore
    options = ['IGNORE_CACHE'];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(cacheCount(manager)).toBe(1);
  });

  it('should reset the cache if the option enum is included in the options array.', async () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);
    setCache(manager, userKey, userValue, ['a']);
    setCache(manager, userKey, '123', ['a']);
    setCache(manager, userKey, '456', ['a']);
    options = [OptimizelySegmentOption.RESET_CACHE];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(peekCache(manager, userKey, userValue)).toEqual(segments);
    expect(cacheCount(manager)).toBe(1);
  });

  it('should reset the cache on settings update.', async () => {
    const oldConfig = new OdpConfig('old-key', 'old-host', 'pixel-url', ['new-customer']);
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);

    setCache(manager, userKey, userValue, ['a']);
    expect(cacheCount(manager)).toBe(1);

    const newConfig = new OdpConfig('new-key', 'new-host', 'pixel-url', ['new-customer']);
    manager.updateSettings(newConfig);

    expect(cacheCount(manager)).toBe(0);
  });

  it('should reset the cache if the option string is included in the options array.', async () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);
    setCache(manager, userKey, userValue, ['a']);
    setCache(manager, userKey, '123', ['a']);
    setCache(manager, userKey, '456', ['a']);
        // @ts-ignore
    options = ['RESET_CACHE'];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(peekCache(manager, userKey, userValue)).toEqual(segments);
    expect(cacheCount(manager)).toBe(1);
  });

  it('should make a valid cache key.', () => {
    const manager = new OdpSegmentManager(getSegmentsCache(), apiManager, mockLogHandler, validTestOdpConfig);
    expect('vuid-$-test-user').toBe(manager.makeCacheKey(userKey, userValue));
  });

  // Utility Functions

  function setCache(manager: OdpSegmentManager, userKey: string, userValue: string, value: string[]) {
    const cacheKey = manager.makeCacheKey(userKey, userValue);
    manager.segmentsCache.save({
      key: cacheKey,
      value,
    });
  }

  function peekCache(manager: OdpSegmentManager, userKey: string, userValue: string): string[] | null {
    const cacheKey = manager.makeCacheKey(userKey, userValue);
    return (manager.segmentsCache as LRUCache<string, string[]>).peek(cacheKey);
  }

  const cacheCount = (manager: OdpSegmentManager) => (manager.segmentsCache as LRUCache<string, string[]>).map.size;
});
