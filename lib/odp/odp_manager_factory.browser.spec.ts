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

vi.mock('../utils/http_request_handler/browser_request_handler', () => {
  return { BrowserRequestHandler: vi.fn() };
});

vi.mock('./odp_manager_factory', () => {
  return { getOdpManager: vi.fn().mockImplementation(() => ({})) };
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOdpManager, OdpManagerOptions } from './odp_manager_factory';
import { BROWSER_DEFAULT_API_TIMEOUT, createOdpManager } from './odp_manager_factory.browser';
import { BrowserRequestHandler } from '../utils/http_request_handler/browser_request_handler';
import { pixelApiRequestGenerator } from './event_manager/odp_event_api_manager';

describe('createOdpManager', () => {
  const MockBrowserRequestHandler = vi.mocked(BrowserRequestHandler);
  const mockGetOdpManager = vi.mocked(getOdpManager);

  beforeEach(() => {
    MockBrowserRequestHandler.mockClear();
    mockGetOdpManager.mockClear();
  });

  it('should use BrowserRequestHandler with the provided timeout as the segment request handler', () => {
    const odpManager = createOdpManager({ segmentsApiTimeout: 3456 });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { segmentRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(segmentRequestHandler).toBe(MockBrowserRequestHandler.mock.instances[0]);
    const requestHandlerOptions = MockBrowserRequestHandler.mock.calls[0][0];
    expect(requestHandlerOptions?.timeout).toBe(3456);
  });

  it('should use BrowserRequestHandler with the browser default timeout as the segment request handler', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { segmentRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(segmentRequestHandler).toBe(MockBrowserRequestHandler.mock.instances[0]);
    const requestHandlerOptions = MockBrowserRequestHandler.mock.calls[0][0];
    expect(requestHandlerOptions?.timeout).toBe(BROWSER_DEFAULT_API_TIMEOUT);
  });

  it('should use BrowserRequestHandler with the provided timeout as the event request handler', () => {
    const odpManager = createOdpManager({ eventApiTimeout: 2345 });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(eventRequestHandler).toBe(MockBrowserRequestHandler.mock.instances[1]);
    const requestHandlerOptions = MockBrowserRequestHandler.mock.calls[1][0];
    expect(requestHandlerOptions?.timeout).toBe(2345);
  });

  it('should use BrowserRequestHandler with the browser default timeout as the event request handler', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(eventRequestHandler).toBe(MockBrowserRequestHandler.mock.instances[1]);
    const requestHandlerOptions = MockBrowserRequestHandler.mock.calls[1][0];
    expect(requestHandlerOptions?.timeout).toBe(BROWSER_DEFAULT_API_TIMEOUT);
  });

  it('should use batchSize 1 if batchSize is not provided', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventBatchSize } = mockGetOdpManager.mock.calls[0][0];
    expect(eventBatchSize).toBe(1);
  });

  it('should use batchSize 1 event if some other batchSize value is provided', () => {
    const odpManager = createOdpManager({ eventBatchSize: 99 });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventBatchSize } = mockGetOdpManager.mock.calls[0][0];
    expect(eventBatchSize).toBe(1);
  });

  it('uses the pixel api request generator', () => {
    const odpManager = createOdpManager({ });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventRequestGenerator } = mockGetOdpManager.mock.calls[0][0];
    expect(eventRequestGenerator).toBe(pixelApiRequestGenerator);
  });

  it('uses the passed options for relevant fields', () => {
    const options: OdpManagerOptions = {
      segmentsCache: {} as any,
      segmentsCacheSize: 11,
      segmentsCacheTimeout: 2025,
      segmentManager: {} as any,
      eventFlushInterval: 2222,
      eventManager: {} as any,
      userAgentParser: {} as any,
    };
    const odpManager = createOdpManager(options);
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    expect(mockGetOdpManager).toHaveBeenNthCalledWith(1, expect.objectContaining(options));
  });
});
