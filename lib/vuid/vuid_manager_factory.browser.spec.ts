/**
 * Copyright 2024, Optimizely
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

import { vi, describe, expect, it, beforeEach } from 'vitest';

vi.mock('../utils/cache/local_storage_cache.browser', () => {
  return {
    LocalStorageCache: vi.fn(),
  };
});

vi.mock('./vuid_manager', () => {
  return {
    DefaultVuidManager: vi.fn(),
    VuidCacheManager: vi.fn(),
  };
});

import { getMockSyncCache } from '../tests/mock/mock_cache';
import { createVuidManager } from './vuid_manager_factory.browser';
import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { DefaultVuidManager, VuidCacheManager } from './vuid_manager';
import { extractVuidManager } from './vuid_manager_factory';

describe('createVuidManager', () => {
  const MockVuidCacheManager = vi.mocked(VuidCacheManager);
  const MockLocalStorageCache = vi.mocked(LocalStorageCache);
  const MockDefaultVuidManager = vi.mocked(DefaultVuidManager);

  beforeEach(() => {
    MockLocalStorageCache.mockClear();
    MockDefaultVuidManager.mockClear();
  });

  it('should pass the enableVuid option to the DefaultVuidManager', () => {
    const manager = extractVuidManager(createVuidManager({ enableVuid: true }));
    expect(manager).toBe(MockDefaultVuidManager.mock.instances[0]);
    expect(MockDefaultVuidManager.mock.calls[0][0].enableVuid).toBe(true);

    const manager2 = extractVuidManager(createVuidManager({ enableVuid: false }));
    expect(manager2).toBe(MockDefaultVuidManager.mock.instances[1]);
    expect(MockDefaultVuidManager.mock.calls[1][0].enableVuid).toBe(false);
  });

  it('should use the provided cache', () => {
    const cache = getMockSyncCache<string>();
    const manager = extractVuidManager(createVuidManager({ enableVuid: true, vuidCache: cache }));
    expect(manager).toBe(MockDefaultVuidManager.mock.instances[0]);
    expect(MockDefaultVuidManager.mock.calls[0][0].vuidCache).toBe(cache);
  });

  it('should use a LocalStorageCache if no cache is provided', () => {
    const manager = extractVuidManager(createVuidManager({ enableVuid: true }));
    expect(manager).toBe(MockDefaultVuidManager.mock.instances[0]);

    const usedCache = MockDefaultVuidManager.mock.calls[0][0].vuidCache;
    expect(usedCache).toBe(MockLocalStorageCache.mock.instances[0]);
  });

  it('should use a single VuidCacheManager instance for all VuidManager instances', () => {
    const manager1 = extractVuidManager(createVuidManager({ enableVuid: true }));
    const manager2 = extractVuidManager(createVuidManager({ enableVuid: true }));
    expect(manager1).toBe(MockDefaultVuidManager.mock.instances[0]);
    expect(manager2).toBe(MockDefaultVuidManager.mock.instances[1]);
    expect(MockVuidCacheManager.mock.instances.length).toBe(1);

    const usedCacheManager1 = MockDefaultVuidManager.mock.calls[0][0].vuidCacheManager;
    const usedCacheManager2 = MockDefaultVuidManager.mock.calls[1][0].vuidCacheManager;
    expect(usedCacheManager1).toBe(usedCacheManager2);
    expect(usedCacheManager1).toBe(MockVuidCacheManager.mock.instances[0]);
  });
});
