import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createOdpManager } from './odp_manager_factory.browser';
import { getMockRequestHandler } from '../tests/mock/mock_request_handler';

describe('createOdpManager', () => {
  it('should use BrowserRequestHandler with the provided timeout as the segment request handler', () => {
    const odpManager = createOdpManager({ segmentsApiTimeout: 1000 });
    expect((odpManager as any).segmentRequestHandler.timeout).toBe(1000);
  });
});
