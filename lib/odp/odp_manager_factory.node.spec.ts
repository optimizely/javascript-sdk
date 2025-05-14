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

vi.mock('../utils/http_request_handler/request_handler.node', () => {
  return { NodeRequestHandler: vi.fn() };
});

vi.mock('./odp_manager_factory', () => {
  return { 
    getOdpManager: vi.fn().mockImplementation(() => ({})),
    getOpaqueOdpManager: vi.fn().mockImplementation(() => ({})) 
  };
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOpaqueOdpManager, OdpManagerOptions } from './odp_manager_factory';
import { NODE_DEFAULT_API_TIMEOUT, NODE_DEFAULT_BATCH_SIZE, NODE_DEFAULT_FLUSH_INTERVAL, createOdpManager } from './odp_manager_factory.node';
import { NodeRequestHandler } from '../utils/http_request_handler/request_handler.node';
import { eventApiRequestGenerator } from './event_manager/odp_event_api_manager';

describe('createOdpManager', () => {
  const MockNodeRequestHandler = vi.mocked(NodeRequestHandler);
  const mockGetOpaqueOdpManager = vi.mocked(getOpaqueOdpManager);

  beforeEach(() => {
    MockNodeRequestHandler.mockClear();
    mockGetOpaqueOdpManager.mockClear();
  });

  it('should use NodeRequestHandler with the provided timeout as the segment request handler', () => {
    const odpManager = createOdpManager({ segmentsApiTimeout: 3456 });
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { segmentRequestHandler } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(segmentRequestHandler).toBe(MockNodeRequestHandler.mock.instances[0]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[0][0];
    expect(requestHandlerOptions?.timeout).toBe(3456);
  });

  it('should use NodeRequestHandler with the node default timeout as the segment request handler', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { segmentRequestHandler } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(segmentRequestHandler).toBe(MockNodeRequestHandler.mock.instances[0]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[0][0];
    expect(requestHandlerOptions?.timeout).toBe(NODE_DEFAULT_API_TIMEOUT);
  });

  it('should use NodeRequestHandler with the provided timeout as the event request handler', () => {
    const odpManager = createOdpManager({ eventApiTimeout: 2345 });
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { eventRequestHandler } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(eventRequestHandler).toBe(MockNodeRequestHandler.mock.instances[1]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[1][0];
    expect(requestHandlerOptions?.timeout).toBe(2345);
  });

  it('should use NodeRequestHandler with the node default timeout as the event request handler', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { eventRequestHandler } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(eventRequestHandler).toBe(MockNodeRequestHandler.mock.instances[1]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[1][0];
    expect(requestHandlerOptions?.timeout).toBe(NODE_DEFAULT_API_TIMEOUT);
  });

  it('uses the event api request generator', () => {
    const odpManager = createOdpManager({ });
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { eventRequestGenerator } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(eventRequestGenerator).toBe(eventApiRequestGenerator);
  });

  it('should use the provided eventBatchSize', () => {
    const odpManager = createOdpManager({ eventBatchSize: 99 });
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { eventBatchSize } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(eventBatchSize).toBe(99);
  });

  it('should use the node default eventBatchSize if none provided', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { eventBatchSize } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(eventBatchSize).toBe(NODE_DEFAULT_BATCH_SIZE);
  });

  it('should use the provided eventFlushInterval', () => {
    const odpManager = createOdpManager({ eventFlushInterval: 9999 });
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { eventFlushInterval } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(eventFlushInterval).toBe(9999);
  });

  it('should use the node default eventFlushInterval if none provided', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    const { eventFlushInterval } = mockGetOpaqueOdpManager.mock.calls[0][0];
    expect(eventFlushInterval).toBe(NODE_DEFAULT_FLUSH_INTERVAL);
  });

  it('uses the passed options for relevant fields', () => {
    const options: OdpManagerOptions = {
      segmentsCache: {} as any,
      segmentsCacheSize: 11,
      segmentsCacheTimeout: 2025,
      userAgentParser: {} as any,
    };
    const odpManager = createOdpManager(options);
    expect(odpManager).toBe(mockGetOpaqueOdpManager.mock.results[0].value);
    expect(mockGetOpaqueOdpManager).toHaveBeenNthCalledWith(1, expect.objectContaining(options));
  });
});
