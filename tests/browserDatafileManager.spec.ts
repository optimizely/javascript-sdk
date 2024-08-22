/**
 * Copyright 2022, 2024, Optimizely
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

import { describe, beforeEach, afterEach, it, expect, vi, MockInstance } from 'vitest';

import BrowserDatafileManager from '../lib/modules/datafile-manager/browserDatafileManager';
import * as browserRequest from '../lib/modules/datafile-manager/browserRequest';
import { Headers, AbortableRequest } from '../lib/modules/datafile-manager/http';
import { advanceTimersByTime, getTimerCount } from './testUtils';

describe('browserDatafileManager', () => {
  let makeGetRequestSpy: MockInstance<(reqUrl: string, headers: Headers) => AbortableRequest>;
  beforeEach(() => {
    vi.useFakeTimers();
    makeGetRequestSpy = vi.spyOn(browserRequest, 'makeGetRequest');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('calls makeGetRequest when started', async () => {
    makeGetRequestSpy.mockReturnValue({
      abort: vi.fn(),
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {},
      }),
    });

    const manager = new BrowserDatafileManager({
      sdkKey: '1234',
      autoUpdate: false,
    });
    manager.start();
    expect(makeGetRequestSpy).toBeCalledTimes(1);
    expect(makeGetRequestSpy.mock.calls[0][0]).toBe('https://cdn.optimizely.com/datafiles/1234.json');
    expect(makeGetRequestSpy.mock.calls[0][1]).toEqual({});

    await manager.onReady();
    await manager.stop();
  });

  it('calls makeGetRequest for live update requests', async () => {
    makeGetRequestSpy.mockReturnValue({
      abort: vi.fn(),
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {
          'last-modified': 'Fri, 08 Mar 2019 18:57:17 GMT',
        },
      }),
    });
    const manager = new BrowserDatafileManager({
      sdkKey: '1234',
      autoUpdate: true,
    });
    manager.start();
    await manager.onReady();
    await advanceTimersByTime(300000);
    expect(makeGetRequestSpy).toBeCalledTimes(2);
    expect(makeGetRequestSpy.mock.calls[1][0]).toBe('https://cdn.optimizely.com/datafiles/1234.json');
    expect(makeGetRequestSpy.mock.calls[1][1]).toEqual({
      'if-modified-since': 'Fri, 08 Mar 2019 18:57:17 GMT',
    });

    await manager.stop();
  });

  it('defaults to false for autoUpdate', async () => {
    makeGetRequestSpy.mockReturnValue({
      abort: vi.fn(),
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {
          'last-modified': 'Fri, 08 Mar 2019 18:57:17 GMT',
        },
      }),
    });
    const manager = new BrowserDatafileManager({
      sdkKey: '1234',
    });
    manager.start();
    await manager.onReady();
    // Should not set a timeout for a later update
    expect(getTimerCount()).toBe(0);

    await manager.stop();
  });
});
