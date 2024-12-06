vi.mock('../utils/http_request_handler/node_request_handler', () => {
  return { NodeRequestHandler: vi.fn() };
});

vi.mock('./odp_manager_factory', () => {
  return { getOdpManager: vi.fn().mockImplementation(() => ({})) };
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOdpManager, OdpManagerOptions } from './odp_manager_factory';
import { NODE_DEFAULT_API_TIMEOUT, NODE_DEFAULT_BATCH_SIZE, NODE_DEFAULT_FLUSH_INTERVAL, createOdpManager } from './odp_manager_factory.node';
import { NodeRequestHandler } from '../utils/http_request_handler/node_request_handler';
import { eventApiRequestGenerator } from './event_manager/odp_event_api_manager';

describe('createOdpManager', () => {
  const MockNodeRequestHandler = vi.mocked(NodeRequestHandler);
  const mockGetOdpManager = vi.mocked(getOdpManager);

  beforeEach(() => {
    MockNodeRequestHandler.mockClear();
    mockGetOdpManager.mockClear();
  });

  it('should use NodeRequestHandler with the provided timeout as the segment request handler', () => {
    const odpManager = createOdpManager({ segmentsApiTimeout: 3456 });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { segmentRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(segmentRequestHandler).toBe(MockNodeRequestHandler.mock.instances[0]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[0][0];
    expect(requestHandlerOptions?.timeout).toBe(3456);
  });

  it('should use NodeRequestHandler with the node default timeout as the segment request handler', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { segmentRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(segmentRequestHandler).toBe(MockNodeRequestHandler.mock.instances[0]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[0][0];
    expect(requestHandlerOptions?.timeout).toBe(NODE_DEFAULT_API_TIMEOUT);
  });

  it('should use NodeRequestHandler with the provided timeout as the event request handler', () => {
    const odpManager = createOdpManager({ eventApiTimeout: 2345 });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(eventRequestHandler).toBe(MockNodeRequestHandler.mock.instances[1]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[1][0];
    expect(requestHandlerOptions?.timeout).toBe(2345);
  });

  it('should use NodeRequestHandler with the node default timeout as the event request handler', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventRequestHandler } = mockGetOdpManager.mock.calls[0][0];
    expect(eventRequestHandler).toBe(MockNodeRequestHandler.mock.instances[1]);
    const requestHandlerOptions = MockNodeRequestHandler.mock.calls[1][0];
    expect(requestHandlerOptions?.timeout).toBe(NODE_DEFAULT_API_TIMEOUT);
  });

  it('uses the event api request generator', () => {
    const odpManager = createOdpManager({ });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventRequestGenerator } = mockGetOdpManager.mock.calls[0][0];
    expect(eventRequestGenerator).toBe(eventApiRequestGenerator);
  });

  it('should use the provided eventBatchSize', () => {
    const odpManager = createOdpManager({ eventBatchSize: 99 });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventBatchSize } = mockGetOdpManager.mock.calls[0][0];
    expect(eventBatchSize).toBe(99);
  });

  it('should use the node default eventBatchSize if none provided', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventBatchSize } = mockGetOdpManager.mock.calls[0][0];
    expect(eventBatchSize).toBe(NODE_DEFAULT_BATCH_SIZE);
  });

  it('should use the provided eventFlushInterval', () => {
    const odpManager = createOdpManager({ eventFlushInterval: 9999 });
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventFlushInterval } = mockGetOdpManager.mock.calls[0][0];
    expect(eventFlushInterval).toBe(9999);
  });

  it('should use the node default eventFlushInterval if none provided', () => {
    const odpManager = createOdpManager({});
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    const { eventFlushInterval } = mockGetOdpManager.mock.calls[0][0];
    expect(eventFlushInterval).toBe(NODE_DEFAULT_FLUSH_INTERVAL);
  });

  it('uses the passed options for relevant fields', () => {
    const options: OdpManagerOptions = {
      segmentsCache: {} as any,
      segmentsCacheSize: 11,
      segmentsCacheTimeout: 2025,
      segmentManager: {} as any,
      eventManager: {} as any,
      userAgentParser: {} as any,
    };
    const odpManager = createOdpManager(options);
    expect(odpManager).toBe(mockGetOdpManager.mock.results[0].value);
    expect(mockGetOdpManager).toHaveBeenNthCalledWith(1, expect.objectContaining(options));
  });
});
