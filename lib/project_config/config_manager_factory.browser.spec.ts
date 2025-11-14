/**
 * Copyright 2024-2025, Optimizely
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
    getOpaquePollingConfigManager: vi.fn().mockReturnValueOnce({ foo: 'bar' }),
  };
});

vi.mock('../utils/http_request_handler/request_handler.browser', () => {
  const BrowserRequestHandler = vi.fn();
  return { BrowserRequestHandler };
});

import { getOpaquePollingConfigManager, PollingConfigManagerConfig, PollingConfigManagerFactoryOptions } from './config_manager_factory';
import { createPollingProjectConfigManager } from './config_manager_factory.browser';
import { BrowserRequestHandler } from '../utils/http_request_handler/request_handler.browser';
import { getMockSyncCache } from '../tests/mock/mock_cache';

describe('createPollingConfigManager', () => {
  const mockGetOpaquePollingConfigManager = vi.mocked(getOpaquePollingConfigManager);
  const MockBrowserRequestHandler = vi.mocked(BrowserRequestHandler);

  beforeEach(() => {
    mockGetOpaquePollingConfigManager.mockClear();
    MockBrowserRequestHandler.mockClear();
  });

  it('creates and returns the instance by calling getPollingConfigManager', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(Object.is(projectConfigManager, mockGetOpaquePollingConfigManager.mock.results[0].value)).toBe(true);
  });

  it('uses an instance of BrowserRequestHandler as requestHandler', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(Object.is(mockGetOpaquePollingConfigManager.mock.calls[0][0].requestHandler, MockBrowserRequestHandler.mock.instances[0])).toBe(true);
  });

  it('uses uses autoUpdate = false by default', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetOpaquePollingConfigManager.mock.calls[0][0].autoUpdate).toBe(false);
  });

  it('uses the provided options', () => {
    const config: PollingConfigManagerConfig = {
      datafile: '{}',
      jsonSchemaValidator: vi.fn(),
      sdkKey: 'sdkKey',
      updateInterval: 50000,
      autoUpdate: true,
      urlTemplate: 'urlTemplate',
      datafileAccessToken: 'datafileAccessToken',
      customHeaders: { 'X-Test-Header': 'test-value' },
      cache: getMockSyncCache<string>(),
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetOpaquePollingConfigManager).toHaveBeenNthCalledWith(1, expect.objectContaining(config));
  }); 

  it('passes customHeaders through to the underlying config manager', () => {
    const customHeaders = {
      'X-Custom-Header': 'custom-value',
      'X-Another-Header': 'another-value',
    };
    
    const config = {
      sdkKey: 'sdkKey',
      customHeaders,
    };

    createPollingProjectConfigManager(config);
    expect(mockGetOpaquePollingConfigManager).toHaveBeenCalledWith(
      expect.objectContaining({
        customHeaders,
      })
    );
  });
});
