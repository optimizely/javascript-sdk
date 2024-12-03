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

import { describe, it, expect, vi } from 'vitest';


import { ODP_USER_KEY } from '../constant';
import { DefaultOdpSegmentManager } from './odp_segment_manager';
import { OdpConfig } from '../odp_config';
import { OptimizelySegmentOption } from './optimizely_segment_option';
import { getMockLogger } from '../../tests/mock/mock_logger';
import { getMockSyncCache } from '../../tests/mock/mock_cache';

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com';
const PIXEL_URL = 'https://odp.pixel.com';
const SEGMENTS_TO_CHECK = ['segment1', 'segment2'];

const config = new OdpConfig(API_KEY, API_HOST, PIXEL_URL, SEGMENTS_TO_CHECK);

const getMockApiManager = () => {
  return {
    fetchSegments: vi.fn(), 
  };
};

const userKey: ODP_USER_KEY = ODP_USER_KEY.FS_USER_ID;
const userValue = 'test-user';

describe('DefaultOdpSegmentManager', () => {
  it('should return null and log error if the ODP config is not available.', async () => {
    const logger = getMockLogger();
    const cache = getMockSyncCache<string[]>();
    const manager = new DefaultOdpSegmentManager(cache, getMockApiManager(), logger);
    expect(await manager.fetchQualifiedSegments(userKey, userValue)).toBeNull();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('should return null and log error if ODP is not integrated.', async () => {
    const logger = getMockLogger();
    const cache = getMockSyncCache<string[]>();
    const manager = new DefaultOdpSegmentManager(cache, getMockApiManager(), logger);
    manager.updateConfig({ integrated: false });
    expect(await manager.fetchQualifiedSegments(userKey, userValue)).toBeNull();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('should fetch segments from apiManager using correct config on cache miss and save to cache.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();
    apiManager.fetchSegments.mockResolvedValue(['k', 'l']);
    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    manager.updateConfig({ integrated: true, odpConfig: config });

    const segments = await manager.fetchQualifiedSegments(userKey, userValue);
    expect(segments).toEqual(['k', 'l']);
    expect(apiManager.fetchSegments).toHaveBeenCalledWith(API_KEY, API_HOST, userKey, userValue, SEGMENTS_TO_CHECK);
    expect(cache.get(manager.makeCacheKey(userKey, userValue))).toEqual(['k', 'l']);
  });

  it('should return sement from cache and not call apiManager on cache hit.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();

    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    manager.updateConfig({ integrated: true, odpConfig: config });

    cache.set(manager.makeCacheKey(userKey, userValue), ['x']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue);
    expect(segments).toEqual(['x']);

    expect(apiManager.fetchSegments).not.toHaveBeenCalled();
  });

  it('should return null when apiManager returns null.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();
    apiManager.fetchSegments.mockResolvedValue(null);
    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    manager.updateConfig({ integrated: true, odpConfig: config });

    const segments = await manager.fetchQualifiedSegments(userKey, userValue);
    expect(segments).toBeNull();
  });

  it('should ignore the cache if the option enum is included in the options array.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();
    apiManager.fetchSegments.mockResolvedValue(['k', 'l']);
    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    manager.updateConfig({ integrated: true, odpConfig: config });
    cache.set(manager.makeCacheKey(userKey, userValue), ['x']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, [OptimizelySegmentOption.IGNORE_CACHE]);
    expect(segments).toEqual(['k', 'l']);
    expect(cache.get(manager.makeCacheKey(userKey, userValue))).toEqual(['x']);
    expect(apiManager.fetchSegments).toHaveBeenCalledWith(API_KEY, API_HOST, userKey, userValue, SEGMENTS_TO_CHECK);
  });

  it('should ignore the cache if the option string is included in the options array.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();
    apiManager.fetchSegments.mockResolvedValue(['k', 'l']);
    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    manager.updateConfig({ integrated: true, odpConfig: config });
    cache.set(manager.makeCacheKey(userKey, userValue), ['x']);

     // @ts-ignore
    const segments = await manager.fetchQualifiedSegments(userKey, userValue, ['IGNORE_CACHE']);
    expect(segments).toEqual(['k', 'l']);
    expect(cache.get(manager.makeCacheKey(userKey, userValue))).toEqual(['x']);
    expect(apiManager.fetchSegments).toHaveBeenCalledWith(API_KEY, API_HOST, userKey, userValue, SEGMENTS_TO_CHECK);
  });

  it('should reset the cache if the option enum is included in the options array.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();
    apiManager.fetchSegments.mockResolvedValue(['k', 'l']);

    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    manager.updateConfig({ integrated: true, odpConfig: config });
    cache.set(manager.makeCacheKey(userKey, userValue), ['x']);
    cache.set(manager.makeCacheKey(userKey, '123'), ['a']);
    cache.set(manager.makeCacheKey(userKey, '456'), ['b']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, [OptimizelySegmentOption.RESET_CACHE]);
    expect(segments).toEqual(['k', 'l']);
    expect(cache.get(manager.makeCacheKey(userKey, userValue))).toEqual(['k', 'l']);
    expect(cache.size()).toBe(1);
  });

  it('should reset the cache if the option string is included in the options array.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();
    apiManager.fetchSegments.mockResolvedValue(['k', 'l']);

    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    manager.updateConfig({ integrated: true, odpConfig: config });
    cache.set(manager.makeCacheKey(userKey, userValue), ['x']);
    cache.set(manager.makeCacheKey(userKey, '123'), ['a']);
    cache.set(manager.makeCacheKey(userKey, '456'), ['b']);

    // @ts-ignore
    const segments = await manager.fetchQualifiedSegments(userKey, userValue, ['RESET_CACHE']);
    expect(segments).toEqual(['k', 'l']);
    expect(cache.get(manager.makeCacheKey(userKey, userValue))).toEqual(['k', 'l']);
    expect(cache.size()).toBe(1);
  });

  it('should reset the cache on config update.', async () => {
    const cache = getMockSyncCache<string[]>();
    const apiManager = getMockApiManager();
    apiManager.fetchSegments.mockResolvedValue(['k', 'l']);

    const manager = new DefaultOdpSegmentManager(cache, apiManager);
    cache.set(manager.makeCacheKey(userKey, userValue), ['x']);
    cache.set(manager.makeCacheKey(userKey, '123'), ['a']);
    cache.set(manager.makeCacheKey(userKey, '456'), ['b']);

    expect(cache.size()).toBe(3);
    manager.updateConfig({ integrated: true, odpConfig: config });
    expect(cache.size()).toBe(0);
  });
});
