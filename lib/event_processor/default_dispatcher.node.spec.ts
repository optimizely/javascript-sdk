import { vi, expect, it, describe, afterAll } from 'vitest';

vi.mock('./default_dispatcher', () => {
  const DefaultEventDispatcher = vi.fn();
  return { DefaultEventDispatcher };
});

vi.mock('../utils/http_request_handler/node_request_handler', () => {
  const NodeRequestHandler = vi.fn();
  return { NodeRequestHandler };
});

import { DefaultEventDispatcher } from './default_dispatcher';
import { NodeRequestHandler } from '../utils/http_request_handler/node_request_handler';
import eventDispatcher from './default_dispatcher.node';

describe('eventDispatcher', () => {
  const MockNodeRequestHandler = vi.mocked(NodeRequestHandler);
  const MockDefaultEventDispatcher = vi.mocked(DefaultEventDispatcher);

  afterAll(() => {
    MockDefaultEventDispatcher.mockReset();
    MockNodeRequestHandler.mockReset();
  })

  it('creates and returns the instance by calling DefaultEventDispatcher', () => {
    expect(Object.is(eventDispatcher, MockDefaultEventDispatcher.mock.instances[0])).toBe(true);
  });

  it('uses a NodeRequestHandler', () => {
    expect(Object.is(eventDispatcher, MockDefaultEventDispatcher.mock.instances[0])).toBe(true);
    expect(Object.is(MockDefaultEventDispatcher.mock.calls[0][0], MockNodeRequestHandler.mock.instances[0])).toBe(true);
  });
});
