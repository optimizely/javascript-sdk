import { vi, describe, expect, it, beforeEach } from 'vitest';

vi.mock('../utils/cache/async_storage_cache.react_native', () => {
  return {
    AsyncStorageCache: vi.fn(),
  };
});

vi.mock('./vuid_manager', () => {
  return {
    DefaultVuidManager: vi.fn(),
    VuidCacheManager: vi.fn(),
  };
});

import { getMockAsyncCache } from '../tests/mock/mock_cache';
import { createVuidManager } from './vuid_manager_factory.react_native';
import { AsyncStorageCache } from '../utils/cache/async_storage_cache.react_native';

import { DefaultVuidManager, VuidCacheManager } from './vuid_manager';

describe('createVuidManager', () => {
  const MockVuidCacheManager = vi.mocked(VuidCacheManager);
  const MockAsyncStorageCache = vi.mocked(AsyncStorageCache);
  const MockDefaultVuidManager = vi.mocked(DefaultVuidManager);

  beforeEach(() => {
    MockAsyncStorageCache.mockClear();
    MockDefaultVuidManager.mockClear();
  });

  it('should pass the enableVuid option to the DefaultVuidManager', () => {
    const manager = createVuidManager({ enableVuid: true });
    expect(manager).toBe(MockDefaultVuidManager.mock.instances[0]);
    expect(MockDefaultVuidManager.mock.calls[0][0].enableVuid).toBe(true);

    const manager2 = createVuidManager({ enableVuid: false });
    expect(manager2).toBe(MockDefaultVuidManager.mock.instances[1]);
    expect(MockDefaultVuidManager.mock.calls[1][0].enableVuid).toBe(false);
  });

  it('should use the provided cache', () => {
    const cache = getMockAsyncCache<string>();
    const manager = createVuidManager({ enableVuid: true, vuidCache: cache });
    expect(manager).toBe(MockDefaultVuidManager.mock.instances[0]);
    expect(MockDefaultVuidManager.mock.calls[0][0].vuidCache).toBe(cache);
  });

  it('should use a AsyncStorageCache if no cache is provided', () => {
    const manager = createVuidManager({ enableVuid: true });
    expect(manager).toBe(MockDefaultVuidManager.mock.instances[0]);

    const usedCache = MockDefaultVuidManager.mock.calls[0][0].vuidCache;
    expect(usedCache).toBe(MockAsyncStorageCache.mock.instances[0]);
  });

  it('should use a single VuidCacheManager instance for all VuidManager instances', () => {
    const manager1 = createVuidManager({ enableVuid: true });
    const manager2 = createVuidManager({ enableVuid: true });
    expect(manager1).toBe(MockDefaultVuidManager.mock.instances[0]);
    expect(manager2).toBe(MockDefaultVuidManager.mock.instances[1]);
    expect(MockVuidCacheManager.mock.instances.length).toBe(1);

    const usedCacheManager1 = MockDefaultVuidManager.mock.calls[0][0].vuidCacheManager;
    const usedCacheManager2 = MockDefaultVuidManager.mock.calls[1][0].vuidCacheManager;
    expect(usedCacheManager1).toBe(usedCacheManager2);
    expect(usedCacheManager1).toBe(MockVuidCacheManager.mock.instances[0]);
  });
});
