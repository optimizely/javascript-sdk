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

vi.mock('./config_manager_factory', () => {
  return {
    getPollingConfigManager: vi.fn().mockReturnValueOnce({ foo: 'bar' }),
  };
});

vi.mock('../utils/http_request_handler/browser_request_handler', () => {
  const BrowserRequestHandler = vi.fn();
  return { BrowserRequestHandler };
});

vi.mock('../plugins/key_value_cache/reactNativeAsyncStorageCache', () => {
  const ReactNativeAsyncStorageCache = vi.fn();
  return { 'default': ReactNativeAsyncStorageCache };
});

import { getPollingConfigManager, PollingConfigManagerConfig, PollingConfigManagerFactoryOptions } from './config_manager_factory';
import { createPollingProjectConfigManager } from './config_manager_factory.react_native';
import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import ReactNativeAsyncStorageCache from '../plugins/key_value_cache/reactNativeAsyncStorageCache';

describe('createPollingConfigManager', () => {
  const mockGetPollingConfigManager = vi.mocked(getPollingConfigManager);
  const MockBrowserRequestHandler = vi.mocked(BrowserRequestHandler);
  const MockReactNativeAsyncStorageCache = vi.mocked(ReactNativeAsyncStorageCache);

  beforeEach(() => {
    mockGetPollingConfigManager.mockClear();
    MockBrowserRequestHandler.mockClear();
    MockReactNativeAsyncStorageCache.mockClear();
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

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(Object.is(mockGetPollingConfigManager.mock.calls[0][0].requestHandler, MockBrowserRequestHandler.mock.instances[0])).toBe(true);
  });

  it('uses uses autoUpdate = true by default', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetPollingConfigManager.mock.calls[0][0].autoUpdate).toBe(true);
  });

  it('uses an instance of ReactNativeAsyncStorageCache for caching by default', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(Object.is(mockGetPollingConfigManager.mock.calls[0][0].cache, MockReactNativeAsyncStorageCache.mock.instances[0])).toBe(true);
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
      cache: { get: vi.fn(), set: vi.fn(), contains: vi.fn(), remove: vi.fn() },
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetPollingConfigManager).toHaveBeenNthCalledWith(1, expect.objectContaining(config));
  }); 
});
