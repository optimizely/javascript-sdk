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

import { DefaultVuidManager } from './vuid_manager'
import { getMockAsyncCache, getMockSyncCache } from '../tests/mock/mock_cache';
import { isVuid } from './vuid';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { exhaustMicrotasks } from '../tests/testUtils';

const  vuidCacheKey = 'optimizely-vuid';

describe('DefaultVuidManager', () => {;
  describe('when configured with enableVuid = true', () => {
    it('should create and save a new vuid if there is no vuid in cache', async () => {
      const cache = getMockSyncCache<string>();
      const manager = new DefaultVuidManager(cache);

      await manager.configure({ enableVuid: true });
  
      const savedVuid = cache.get(vuidCacheKey);
      expect(isVuid(manager.getVuid()!)).toBe(true);
      expect(savedVuid).toBe(manager.getVuid());
    });
  
    it('should create and save a new vuid if old VUID from cache is not valid', async () => {
      const cache = getMockSyncCache<string>();
      cache.set(vuidCacheKey, 'invalid-vuid');

      const manager = new DefaultVuidManager(cache);
      await manager.configure({ enableVuid: true });
  
      const savedVuid = cache.get(vuidCacheKey);
      expect(isVuid(manager.getVuid()!)).toBe(true);
      expect(savedVuid).toBe(manager.getVuid());
    });

    it('should use the vuid in cache if available', async () => {
      const cache = getMockSyncCache<string>();
      cache.set(vuidCacheKey, 'vuid_valid');

      const manager = new DefaultVuidManager(cache);
      await manager.configure({ enableVuid: true });
  
      const savedVuid = cache.get(vuidCacheKey);
      expect(isVuid(manager.getVuid()!)).toBe(true);
      expect(savedVuid).toBe(manager.getVuid());
      expect(savedVuid).toBe('vuid_valid');
    });
  });

  describe('when configured with enableVuid = false', () => {
    it('should remove existing vuid form memory and cache', async () => {
      const cache = getMockSyncCache<string>();
      const manager = new DefaultVuidManager(cache);

      await manager.configure({ enableVuid: true });
  
      const savedVuid = cache.get(vuidCacheKey);
      expect(isVuid(manager.getVuid()!)).toBe(true);
      expect(savedVuid).toBe(manager.getVuid());

      await manager.configure({ enableVuid: false });
      expect(manager.getVuid()).toBeUndefined();
      expect(cache.get(vuidCacheKey)).toBeUndefined();
    });
  });

  it('should sequence configure calls', async() => {
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

    const manager = new DefaultVuidManager(cache);
    
    // this should try to remove vuid, which should stay pending
    const configure1 = manager.configure({ enableVuid: false });
    
    // this should try to get the vuid from store
    const configure2 = manager.configure({ enableVuid: true });

    // this should again try to remove vuid
    const configure3 = manager.configure({ enableVuid: false });

    await exhaustMicrotasks();

    expect(removeSpy).toHaveBeenCalledTimes(1); // from the first configure call
    expect(getSpy).not.toHaveBeenCalled();

    // this will resolve the first configure call
    removePromise.resolve(true);
    await exhaustMicrotasks();
    await expect(configure1).resolves.not.toThrow();
   
    // this get call is from the second configure call
    expect(getSpy).toHaveBeenCalledTimes(1);
    await exhaustMicrotasks();

    // as the get call is pending, remove call from the third configure call should not yet happen
    expect(removeSpy).toHaveBeenCalledTimes(1);

    // this should fail the second configure call, allowing the third configure call to proceed
    getPromise.reject(new Error('get failed'));
    await exhaustMicrotasks();
    await expect(configure2).rejects.toThrow();

    expect(removeSpy).toHaveBeenCalledTimes(2);
  });
});
