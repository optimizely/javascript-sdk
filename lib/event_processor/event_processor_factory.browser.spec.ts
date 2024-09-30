import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./default_dispatcher.browser', () => {
  return { default: {} };
});

vi.mock('./forwarding_event_processor', () => {
  const getForwardingEventProcessor = vi.fn().mockReturnValue({});
  return { getForwardingEventProcessor };
});

import { createForwardingEventProcessor } from './event_processor_factory.browser';
import { getForwardingEventProcessor } from './forwarding_event_processor';
import browserDefaultEventDispatcher from './default_dispatcher.browser';

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

  it('uses the browser default event dispatcher if none is provided', () => {
    const processor = createForwardingEventProcessor();
    expect(Object.is(processor, mockGetForwardingEventProcessor.mock.results[0].value)).toBe(true);
    expect(mockGetForwardingEventProcessor).toHaveBeenNthCalledWith(1, browserDefaultEventDispatcher);
  });
});
