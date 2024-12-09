/**
 * Copyright 2022, 2024, Optimizely
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

import { DefaultVuidManager, VuidCacheManager } from './vuid_manager';

import { getMockAsyncCache } from '../tests/mock/mock_cache';
import { isVuid } from './vuid';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { exhaustMicrotasks } from '../tests/testUtils';

const  vuidCacheKey = 'optimizely-vuid';

describe('VuidCacheManager', () => {
  it('should remove vuid from cache', async () => {
    const cache = getMockAsyncCache<string>();
    await cache.set(vuidCacheKey, 'vuid_valid');

    const manager = new VuidCacheManager(cache);
    await manager.remove();
    const vuidInCache = await cache.get(vuidCacheKey);
    expect(vuidInCache).toBeUndefined();
  });

  it('should create and save a new vuid if there is no vuid in cache', async () => {
    const cache = getMockAsyncCache<string>();

    const manager = new VuidCacheManager(cache);
    const vuid = await manager.load();
    const vuidInCache = await cache.get(vuidCacheKey);
    expect(vuidInCache).toBe(vuid);
    expect(isVuid(vuid!)).toBe(true);
  });
  
  it('should create and save a new vuid if old VUID from cache is not valid', async () => {
    const cache = getMockAsyncCache<string>();
    await cache.set(vuidCacheKey, 'invalid-vuid');

    const manager = new VuidCacheManager(cache);
    const vuid = await manager.load();
    const vuidInCache = await cache.get(vuidCacheKey);
    expect(vuidInCache).toBe(vuid);
    expect(isVuid(vuid!)).toBe(true);
  });

  it('should return the same vuid without modifying the cache after creating a new vuid', async () => {
    const cache = getMockAsyncCache<string>();

    const manager = new VuidCacheManager(cache);
    const vuid1 = await manager.load();
    const vuid2 = await manager.load();
    expect(vuid1).toBe(vuid2);
    const vuidInCache = await cache.get(vuidCacheKey);
    expect(vuidInCache).toBe(vuid1);
  });

  it('should use the vuid in cache if available', async () => {
    const cache = getMockAsyncCache<string>();
    cache.set(vuidCacheKey, 'vuid_valid');

    const manager = new VuidCacheManager(cache);
    const vuid1 = await manager.load();
    const vuid2 = await manager.load();
    expect(vuid1).toBe('vuid_valid');
    expect(vuid1).toBe('vuid_valid');
    const vuidInCache = await cache.get(vuidCacheKey);
    expect(vuidInCache).toBe('vuid_valid');
  });

  it('should use the new cache after setCache is called', async () => {
    const cache1 = getMockAsyncCache<string>();
    const cache2 = getMockAsyncCache<string>();

    await cache1.set(vuidCacheKey, 'vuid_123');
    await cache2.set(vuidCacheKey, 'vuid_456');

    const manager = new VuidCacheManager(cache1);
    const vuid1 = await manager.load();
    expect(vuid1).toBe('vuid_123');

    manager.setCache(cache2);
    await manager.load();
    const vuid2 = await cache2.get(vuidCacheKey);
    expect(vuid2).toBe('vuid_456');
  });

  it('should sequence remove and load calls', async() => {
    const cache = getMockAsyncCache<string>();
    const removeSpy = vi.spyOn(cache, 'remove');
    const getSpy = vi.spyOn(cache, 'get');
    const setSpy = vi.spyOn(cache, 'set');

    const removePromise = resolvablePromise();
    removeSpy.mockReturnValueOnce(removePromise.promise);

    const getPromise = resolvablePromise<string>();
    getSpy.mockReturnValueOnce(getPromise.promise);

    const setPromise = resolvablePromise();
    setSpy.mockReturnValueOnce(setPromise.promise);

    const manager = new VuidCacheManager(cache);
    
    // this should try to remove from cached, which should stay pending
    const call1 = manager.remove();
    
    // this should try to get the vuid from store
    const call2 = manager.load();

    // this should again try to remove vuid
    const call3 = manager.remove();

    await exhaustMicrotasks();

    expect(removeSpy).toHaveBeenCalledTimes(1); // from the first configure call
    expect(getSpy).not.toHaveBeenCalled();

    // this will resolve the first configure call
    removePromise.resolve(true);
    await exhaustMicrotasks();
    await expect(call1).resolves.not.toThrow();
   
    // this get call is from the second configure call
    expect(getSpy).toHaveBeenCalledTimes(1);
    await exhaustMicrotasks();

    // as the get call is pending, remove call from the third configure call should not yet happen
    expect(removeSpy).toHaveBeenCalledTimes(1);

    // this should fail the load call, allowing the second remnove call to proceed
    getPromise.reject(new Error('get failed'));
    await exhaustMicrotasks();
    await expect(call2).rejects.toThrow();

    expect(removeSpy).toHaveBeenCalledTimes(2);
  });
});

describe('DefaultVuidManager', () => {
  it('should return undefined for getVuid() before initialization', async () => {
    const vuidCacheManager ={
      remove: vi.fn(),
      load: vi.fn(),
    } as unknown as VuidCacheManager;

    const manager = new DefaultVuidManager({
      vuidCacheManager,
      enableVuid: true
    });

    expect(manager.getVuid()).toBeUndefined();
  });

  it('should call remove on VuidCacheManager if enableVuid is false', async () => {
    const vuidCacheManager ={
      remove: vi.fn(),
      load: vi.fn(),
    } as unknown as VuidCacheManager;

    const manager = new DefaultVuidManager({
      vuidCacheManager,
      enableVuid: false
    });

    await manager.initialize();
    expect(vuidCacheManager.remove).toHaveBeenCalled();
  });

  it('should return undefined for getVuid() after initialization if enableVuid is false', async () => {
    const vuidCacheManager ={
      remove: vi.fn(),
      load: vi.fn(),
    } as unknown as VuidCacheManager;

    const manager = new DefaultVuidManager({
      vuidCacheManager,
      enableVuid: false
    });

    await manager.initialize();
    expect(manager.getVuid()).toBeUndefined();
  });

  it('should load vuid using VuidCacheManger if enableVuid=true', async () => {
    const load = vi.fn();

    const vuidCacheManager ={
      remove: vi.fn(),
      load,
    } as unknown as VuidCacheManager;
    
    load.mockResolvedValue('vuid_valid');

    const manager = new DefaultVuidManager({
      vuidCacheManager,
      enableVuid: true
    });

    await manager.initialize();
    expect(vuidCacheManager.load).toHaveBeenCalled();
    expect(manager.getVuid()).toBe('vuid_valid');
  });
});
