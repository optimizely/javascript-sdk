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

vi.mock('./project_config_manager', () => {
  const MockConfigManager = vi.fn();
  return { ProjectConfigManagerImpl: MockConfigManager };
});

vi.mock('./polling_datafile_manager', () => {
  const MockDatafileManager = vi.fn();
  return { PollingDatafileManager: MockDatafileManager };
});

vi.mock('../utils/repeater/repeater', () => {
  const MockIntervalRepeater = vi.fn();
  const MockExponentialBackoff = vi.fn();
  return { IntervalRepeater: MockIntervalRepeater, ExponentialBackoff: MockExponentialBackoff };
});

import { ProjectConfigManagerImpl } from './project_config_manager';
import { PollingDatafileManager } from './polling_datafile_manager';
import { ExponentialBackoff, IntervalRepeater } from '../utils/repeater/repeater';
import { getPollingConfigManager } from './config_manager_factory';
import { DEFAULT_UPDATE_INTERVAL, UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE } from './constant';
import { getMockSyncCache } from '../tests/mock/mock_cache';
import { LogLevel } from '../modules/logging';

describe('getPollingConfigManager', () => {
  const MockProjectConfigManagerImpl = vi.mocked(ProjectConfigManagerImpl);
  const MockPollingDatafileManager = vi.mocked(PollingDatafileManager);
  const MockIntervalRepeater = vi.mocked(IntervalRepeater);
  const MockExponentialBackoff = vi.mocked(ExponentialBackoff);

  beforeEach(() => {
    MockProjectConfigManagerImpl.mockClear();
    MockPollingDatafileManager.mockClear();
    MockIntervalRepeater.mockClear();
    MockExponentialBackoff.mockClear();
  });

  it('uses a repeater with exponential backoff for the datafileManager', () => {
    const config = {
      sdkKey: 'sdkKey',
      requestHandler: { makeRequest: vi.fn() },
    };
    const projectConfigManager = getPollingConfigManager(config);
    expect(Object.is(projectConfigManager, MockProjectConfigManagerImpl.mock.instances[0])).toBe(true);
    const usedDatafileManager = MockProjectConfigManagerImpl.mock.calls[0][0].datafileManager;
    expect(Object.is(usedDatafileManager, MockPollingDatafileManager.mock.instances[0])).toBe(true);
    const usedRepeater = MockPollingDatafileManager.mock.calls[0][0].repeater;
    expect(Object.is(usedRepeater, MockIntervalRepeater.mock.instances[0])).toBe(true);
    const usedBackoff = MockIntervalRepeater.mock.calls[0][1];
    expect(Object.is(usedBackoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
  });

  it('uses the default update interval if not provided', () => {
    const config = {
      sdkKey: 'sdkKey',
      requestHandler: { makeRequest: vi.fn() },
    };
    getPollingConfigManager(config);
    expect(MockIntervalRepeater.mock.calls[0][0]).toBe(DEFAULT_UPDATE_INTERVAL);
  });

  it('adds a startup log if the update interval is below the minimum', () => {
    const config = {
      sdkKey: 'abcd',
      requestHandler: { makeRequest: vi.fn() },
      updateInterval: 10000,
    };
    getPollingConfigManager(config);
    const startupLogs = MockPollingDatafileManager.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual(expect.arrayContaining([{
      level: LogLevel.WARNING,
      message: UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE,
      params: [],
    }]));
  });

  it('does not add any startup log if the update interval above the minimum', () => {
    const config = {
      sdkKey: 'abcd',
      requestHandler: { makeRequest: vi.fn() },
      updateInterval: 40000,
    };
    getPollingConfigManager(config);
    const startupLogs = MockPollingDatafileManager.mock.calls[0][0].startupLogs;
    expect(startupLogs).toEqual([]);
  });

  it('uses the provided options', () => {
    const config = {
      datafile: '{}',
      jsonSchemaValidator: vi.fn(),
      sdkKey: 'sdkKey',
      requestHandler: { makeRequest: vi.fn() },
      updateInterval: 50000,
      autoUpdate: true,
      urlTemplate: 'urlTemplate',
      datafileAccessToken: 'datafileAccessToken',
      cache: getMockSyncCache<string>(),
    };

    getPollingConfigManager(config);
    expect(MockIntervalRepeater.mock.calls[0][0]).toBe(config.updateInterval);
    expect(MockExponentialBackoff).toHaveBeenNthCalledWith(1, 1000, config.updateInterval, 500);

    expect(MockPollingDatafileManager).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sdkKey: config.sdkKey,
      autoUpdate: config.autoUpdate,
      urlTemplate: config.urlTemplate,
      datafileAccessToken: config.datafileAccessToken,
      requestHandler: config.requestHandler,
      repeater: MockIntervalRepeater.mock.instances[0],
      cache: config.cache,
    }));

    expect(MockProjectConfigManagerImpl).toHaveBeenNthCalledWith(1, expect.objectContaining({
      datafile: config.datafile,
      jsonSchemaValidator: config.jsonSchemaValidator,
    }));
  });
});
