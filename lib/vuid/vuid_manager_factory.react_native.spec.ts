import { vi, describe, expect, it, beforeEach } from 'vitest';

vi.mock('../utils/cache/local_storage_cache.react_native', () => {
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

import { createVuidManager } from './vuid_manager_factory.browser';
import { Async}
import { DefaultVuidManager, VuidCacheManager } from './vuid_manager';

describe('createVuidManager', () => {
  const MockVuidCacheManager = vi.mocked(VuidCacheManager);
  const MockLocalStorageCache = vi.mocked(LocalStorageCache);
  const MockDefaultVuidManager = vi.mocked(DefaultVuidManager);

  beforeEach(() => {
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

  it('should use a VuidCacheManager with a LocalStorageCache', () => {
    const manager = createVuidManager({ enableVuid: true });
    expect(manager).toBe(MockDefaultVuidManager.mock.instances[0]);


    const usedCacheManager = MockDefaultVuidManager.mock.calls[0][0].vuidCacheManager;
    expect(usedCacheManager).toBe(MockVuidCacheManager.mock.instances[0]);

    const usedCache = MockVuidCacheManager.mock.calls[0][0];
    expect(usedCache).toBe(MockLocalStorageCache.mock.instances[0]);
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
