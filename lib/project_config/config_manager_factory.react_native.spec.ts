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

import { describe, it, expect, beforeEach, vi } from 'vitest';

await vi.hoisted(async () => {
  await mockRequireAsyncStorage();
});

let isAsyncStorageAvailable = true;

async function mockRequireAsyncStorage() {
  const { Module } = await import('module');
  const M: any = Module;

  M._load_original = M._load;
  M._load = (uri: string, parent: string) => {
    if (uri === '@react-native-async-storage/async-storage') {
      if (isAsyncStorageAvailable) return { default: {} };
      throw new Error('Module not found: @react-native-async-storage/async-storage');
    }
    return M._load_original(uri, parent);
  };
}

vi.mock('./config_manager_factory', () => {
  return {
    getPollingConfigManager: vi.fn().mockReturnValueOnce({ foo: 'bar' }),
  };
});

vi.mock('../utils/http_request_handler/browser_request_handler', () => {
  const BrowserRequestHandler = vi.fn();
  return { BrowserRequestHandler };
});

vi.mock('../utils/cache/async_storage_cache.react_native', async (importOriginal) => {
  const original: any = await importOriginal();
  const OriginalAsyncStorageCache = original.AsyncStorageCache;
  const MockAsyncStorageCache = vi.fn().mockImplementation(function (this: any, ...args) {
    Object.setPrototypeOf(this, new OriginalAsyncStorageCache(...args));
  });
  return { AsyncStorageCache: MockAsyncStorageCache };
});

import { getPollingConfigManager, PollingConfigManagerConfig } from './config_manager_factory';
import { createPollingProjectConfigManager } from './config_manager_factory.react_native';
import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import { AsyncStorageCache } from '../utils/cache/async_storage_cache.react_native';
import { getMockSyncCache } from '../tests/mock/mock_cache';

describe('createPollingConfigManager', () => {
  const mockGetPollingConfigManager = vi.mocked(getPollingConfigManager);
  const MockBrowserRequestHandler = vi.mocked(BrowserRequestHandler);
  const MockAsyncStorageCache = vi.mocked(AsyncStorageCache);

  beforeEach(() => {
    mockGetPollingConfigManager.mockClear();
    MockBrowserRequestHandler.mockClear();
    MockAsyncStorageCache.mockClear();
  });

  it('creates and returns the instance by calling getPollingConfigManager', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(Object.is(projectConfigManager, mockGetPollingConfigManager.mock.results[0].value)).toBe(true);
  });

  it('uses an instance of BrowserRequestHandler as requestHandler', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    createPollingProjectConfigManager(config);

    expect(
      Object.is(
        mockGetPollingConfigManager.mock.calls[0][0].requestHandler,
        MockBrowserRequestHandler.mock.instances[0]
      )
    ).toBe(true);
  });

  it('uses uses autoUpdate = true by default', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    createPollingProjectConfigManager(config);

    expect(mockGetPollingConfigManager.mock.calls[0][0].autoUpdate).toBe(true);
  });

  it('uses an instance of ReactNativeAsyncStorageCache for caching by default', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    createPollingProjectConfigManager(config);

    expect(
      Object.is(mockGetPollingConfigManager.mock.calls[0][0].cache, MockAsyncStorageCache.mock.instances[0])
    ).toBe(true);
  });

  it('uses the provided options', () => {
    const config: PollingConfigManagerConfig = {
      datafile: '{}',
      jsonSchemaValidator: vi.fn(),
      sdkKey: 'sdkKey',
      updateInterval: 50000,
      autoUpdate: false,
      urlTemplate: 'urlTemplate',
      datafileAccessToken: 'datafileAccessToken',
      cache: getMockSyncCache(),
    };

    createPollingProjectConfigManager(config);

    expect(mockGetPollingConfigManager).toHaveBeenNthCalledWith(1, expect.objectContaining(config));
  });

  it('Should not throw error if a cache is present in the config, and async storage is not available', async () => {
    isAsyncStorageAvailable = false;
    const config = {
      sdkKey: 'sdkKey',
      requestHandler: { makeRequest: vi.fn() },
      cache: getMockSyncCache<string>(),
    };

    expect(() => createPollingProjectConfigManager(config)).not.toThrow();
    isAsyncStorageAvailable = true;
  });

  it('should throw an error if cache is not present in the config, and async storage is not available', async () => {
    isAsyncStorageAvailable = false;

    const config = {
      sdkKey: 'sdkKey',
      requestHandler: { makeRequest: vi.fn() },
    };

    expect(() => createPollingProjectConfigManager(config)).toThrowError(
      'Module not found: @react-native-async-storage/async-storage'
    );
    isAsyncStorageAvailable = true;
  });
});
