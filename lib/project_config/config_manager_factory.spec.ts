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
import { DEFAULT_UPDATE_INTERVAL } from './config';
import exp from 'constants';

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
    expect(MockPollingDatafileManager.mock.calls[0][0].updateInterval).toBe(DEFAULT_UPDATE_INTERVAL);
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
      cache: { get: vi.fn(), set: vi.fn(), contains: vi.fn(), remove: vi.fn() },
    };

    getPollingConfigManager(config);
    expect(MockIntervalRepeater.mock.calls[0][0]).toBe(config.updateInterval);
    expect(MockExponentialBackoff).toHaveBeenNthCalledWith(1, 1000, config.updateInterval, 500);

    expect(MockPollingDatafileManager).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sdkKey: config.sdkKey,
      autoUpdate: config.autoUpdate,
      updateInterval: config.updateInterval,
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
