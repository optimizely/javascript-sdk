import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./config_manager_factory', () => {
  return {
    getPollingConfigManager: vi.fn().mockReturnValueOnce({ foo: 'bar' }),
  };
});

vi.mock('../utils/http_request_handler/node_request_handler', () => {
  const NodeRequestHandler = vi.fn();
  return { NodeRequestHandler };
});

import { getPollingConfigManager, PollingConfigManagerConfig, PollingConfigManagerFactoryOptions } from './config_manager_factory';
import { createPollingProjectConfigManager } from './config_manager_factory.node';
import { NodeRequestHandler } from '../utils/http_request_handler/node_request_handler';
import { DEFAULT_AUTHENTICATED_URL_TEMPLATE, DEFAULT_URL_TEMPLATE } from './config';

describe('createPollingConfigManager', () => {
  const mockGetPollingConfigManager = vi.mocked(getPollingConfigManager);
  const MockNodeRequestHandler = vi.mocked(NodeRequestHandler);

  beforeEach(() => {
    mockGetPollingConfigManager.mockClear();
    MockNodeRequestHandler.mockClear();
  });

  it('creates and returns the instance by calling getPollingConfigManager', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(Object.is(projectConfigManager, mockGetPollingConfigManager.mock.results[0].value)).toBe(true);
  });

  it('uses an instance of NodeRequestHandler as requestHandler', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(Object.is(mockGetPollingConfigManager.mock.calls[0][0].requestHandler, MockNodeRequestHandler.mock.instances[0])).toBe(true);
  });

  it('uses uses autoUpdate = true by default', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetPollingConfigManager.mock.calls[0][0].autoUpdate).toBe(true);
  });

  it('uses the default urlTemplate if datafileAccessToken is not provided', () => {
    const config = {
      sdkKey: 'sdkKey',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetPollingConfigManager.mock.calls[0][0].urlTemplate).toBe(DEFAULT_URL_TEMPLATE);
  });

  it('uses the default authenticated urlTemplate if datafileAccessToken is provided', () => {
    const config = {
      sdkKey: 'sdkKey',
      datafileAccessToken: 'datafileAccessToken',
    };

    const projectConfigManager = createPollingProjectConfigManager(config);
    expect(mockGetPollingConfigManager.mock.calls[0][0].urlTemplate).toBe(DEFAULT_AUTHENTICATED_URL_TEMPLATE);
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
