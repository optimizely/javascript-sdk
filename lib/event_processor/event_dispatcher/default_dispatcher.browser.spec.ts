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

vi.mock('../../utils/http_request_handler/browser_request_handler', () => {
  const BrowserRequestHandler = vi.fn();
  return { BrowserRequestHandler };
});

import { DefaultEventDispatcher } from './default_dispatcher';
import { BrowserRequestHandler } from '../../utils/http_request_handler/browser_request_handler';
import eventDispatcher from './default_dispatcher.browser';

describe('eventDispatcher', () => {
  afterAll(() => {
    MockDefaultEventDispatcher.mockReset();
    MockBrowserRequestHandler.mockReset();
  });
  const MockBrowserRequestHandler = vi.mocked(BrowserRequestHandler);
  const MockDefaultEventDispatcher = vi.mocked(DefaultEventDispatcher);

  it('creates and returns the instance by calling DefaultEventDispatcher', () => {
    expect(Object.is(eventDispatcher, MockDefaultEventDispatcher.mock.instances[0])).toBe(true);
  });

  it('uses a BrowserRequestHandler', () => {
    expect(Object.is(eventDispatcher, MockDefaultEventDispatcher.mock.instances[0])).toBe(true);
    expect(Object.is(MockDefaultEventDispatcher.mock.calls[0][0], MockBrowserRequestHandler.mock.instances[0])).toBe(true);
  });
});
