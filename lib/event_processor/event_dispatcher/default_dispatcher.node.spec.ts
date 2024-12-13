/**
 * Copyright 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { vi, expect, it, describe, afterAll } from 'vitest';

vi.mock('./default_dispatcher', () => {
  const DefaultEventDispatcher = vi.fn();
  return { DefaultEventDispatcher };
});

vi.mock('../../utils/http_request_handler/request_handler.node', () => {
  const NodeRequestHandler = vi.fn();
  return { NodeRequestHandler };
});

import { DefaultEventDispatcher } from './default_dispatcher';
import { NodeRequestHandler } from '../../utils/http_request_handler/request_handler.node';
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
