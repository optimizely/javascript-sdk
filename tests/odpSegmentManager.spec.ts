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

  let manager: OdpSegmentManager;
  let odpConfig: OdpConfig;
  const apiManager = new MockOdpSegmentApiManager(instance(mockRequestHandler), instance(mockLogHandler));

  let options: Array<OptimizelySegmentOption> = [];

  const userKey: ODP_USER_KEY = ODP_USER_KEY.VUID;
  const userValue = 'test-user';

  const validTestOdpConfig = new OdpConfig('valid-key', 'host', 'pixel-url', ['new-customer']);
  const invalidTestOdpConfig = new OdpConfig('invalid-key', 'host', 'pixel-url', ['new-customer']);

  beforeEach(() => {
    resetCalls(mockLogHandler);
    resetCalls(mockRequestHandler);

    const API_KEY = 'test-api-key';
    const API_HOST = 'https://odp.example.com';
    const PIXEL_URL = 'https://odp.pixel.com';
    odpConfig = new OdpConfig(API_KEY, API_HOST, PIXEL_URL, []);
    const segmentsCache = new LRUCache<string, string[]>({
      maxSize: 1000,
      timeout: 1000,
    });

    manager = new OdpSegmentManager(odpConfig, segmentsCache, apiManager);
  });

  it('should fetch segments successfully on cache miss.', async () => {
    odpConfig.update(validTestOdpConfig);
    setCache(userKey, '123', ['a']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
  });

  it('should fetch segments successfully on cache hit.', async () => {
    odpConfig.update(validTestOdpConfig);
    setCache(userKey, userValue, ['a']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['a']);
  });

  it('should throw an error when fetching segments returns an error.', async () => {
    odpConfig.update(invalidTestOdpConfig);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, []);
    expect(segments).toBeNull;
  });

  it('should ignore the cache if the option enum is included in the options array.', async () => {
    odpConfig.update(validTestOdpConfig);
    setCache(userKey, userValue, ['a']);
    options = [OptimizelySegmentOption.IGNORE_CACHE];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(cacheCount()).toBe(1);
  });

  it('should ignore the cache if the option string is included in the options array.', async () => {
    odpConfig.update(validTestOdpConfig);
    setCache(userKey, userValue, ['a']);
    // @ts-ignore
    options = ['IGNORE_CACHE'];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(cacheCount()).toBe(1);
  });

  it('should reset the cache if the option enum is included in the options array.', async () => {
    odpConfig.update(validTestOdpConfig);
    setCache(userKey, userValue, ['a']);
    setCache(userKey, '123', ['a']);
    setCache(userKey, '456', ['a']);
    options = [OptimizelySegmentOption.RESET_CACHE];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(peekCache(userKey, userValue)).toEqual(segments);
    expect(cacheCount()).toBe(1);
  });

  it('should reset the cache if the option string is included in the options array.', async () => {
    odpConfig.update(validTestOdpConfig);
    setCache(userKey, userValue, ['a']);
    setCache(userKey, '123', ['a']);
    setCache(userKey, '456', ['a']);
    // @ts-ignore
    options = ['RESET_CACHE'];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    expect(segments).toEqual(['new-customer']);
    expect(peekCache(userKey, userValue)).toEqual(segments);
    expect(cacheCount()).toBe(1);
  });

  it('should make a valid cache key.', () => {
    expect('vuid-$-test-user').toBe(manager.makeCacheKey(userKey, userValue));
  });

  // Utility Functions

  function setCache(userKey: string, userValue: string, value: string[]) {
    const cacheKey = manager.makeCacheKey(userKey, userValue);
    manager.segmentsCache.save({
      key: cacheKey,
      value,
    });
  }

  function peekCache(userKey: string, userValue: string): string[] | null {
    const cacheKey = manager.makeCacheKey(userKey, userValue);
    return (manager.segmentsCache as LRUCache<string, string[]>).peek(cacheKey);
  }

  const cacheCount = () => (manager.segmentsCache as LRUCache<string, string[]>).map.size;
});
