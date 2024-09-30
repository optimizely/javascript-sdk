import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./default_dispatcher.node', () => {
  return { default: {} };
});

vi.mock('./forwarding_event_processor', () => {
  const getForwardingEventProcessor = vi.fn().mockReturnValue({});
  return { getForwardingEventProcessor };
});

import { createForwardingEventProcessor } from './event_processor_factory.node';
import { getForwardingEventProcessor } from './forwarding_event_processor';
import nodeDefaultEventDispatcher from './default_dispatcher.node';

describe('createForwardingEventProcessor', () => {
  const mockGetForwardingEventProcessor = vi.mocked(getForwardingEventProcessor);

  beforeEach(() => {
    mockGetForwardingEventProcessor.mockClear();
  });
    
  it('returns forwarding event processor by calling getForwardingEventProcessor with the provided dispatcher', () => {
    const eventDispatcher = {
      dispatchEvent: vi.fn(),
    };
    const processor = createForwardingEventProcessor(eventDispatcher);
    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, eventDispatcher);
  });

  it('uses the node default event dispatcher if none is provided', () => {
    const processor = createForwardingEventProcessor();
    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, nodeDefaultEventDispatcher);
  });
});
