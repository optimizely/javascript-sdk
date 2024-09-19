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

import { getPollingConfigManager, PollingConfigManagerConfig, PollingConfigManagerFactoryOptions } from './config_manager_factory';
import { createPollingProjectConfigManager } from './config_manager_factory.browser';
import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';

describe('createPollingConfigManager', () => {
  const mockGetPollingConfigManager = vi.mocked(getPollingConfigManager);
  const MockBrowserRequestHandler = vi.mocked(BrowserRequestHandler);

  beforeEach(() => {
    mockGetPollingConfigManager.mockClear();
    MockBrowserRequestHandler.mockClear();
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

  it('uses uses autoUpdate = false by default', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetPollingConfigManager.mock.calls[0][0].autoUpdate).toBe(false);
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
      cache: { get: vi.fn(), set: vi.fn(), contains: vi.fn(), remove: vi.fn() },
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetPollingConfigManager).toHaveBeenNthCalledWith(1, expect.objectContaining(config));
  }); 
});
