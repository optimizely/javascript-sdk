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

const mockGet = jest.fn().mockImplementation((key: string): Promise<string | undefined> => {
  let val = undefined;
  switch (key) {
    case 'opt-datafile-keyThatExists':
      val = JSON.stringify({ name: 'keyThatExists' });
      break;
  }
  return Promise.resolve(val);
});

const mockSet = jest.fn().mockImplementation((): Promise<void> => {
  return Promise.resolve();
});

const mockContains =  jest.fn().mockImplementation((): Promise<boolean> => {
  return Promise.resolve(false);
});

const mockRemove = jest.fn().mockImplementation((): Promise<boolean> => {
  return Promise.resolve(false);
});

jest.mock('../lib/plugins/key_value_cache/reactNativeAsyncStorageCache', () => {
  return jest.fn().mockImplementation(() => {
    return  {
      get: mockGet,
      set: mockSet, 
      contains: mockContains,
      remove: mockRemove,
    }
  });
});

import { advanceTimersByTime } from './testUtils';
import BrowserDatafileManager from '../lib/modules/datafile-manager/browserDatafileManager';
import { Headers, AbortableRequest, Response } from '../lib/modules/datafile-manager/http';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';
import ReactNativeAsyncStorageCache from '../lib/plugins/key_value_cache/browserAsyncStorageCache';

class MockRequestBrowserDatafileManager extends BrowserDatafileManager {
  queuedResponses: (Response | Error)[] = [];

  responsePromises: Promise<Response>[] = [];

  simulateResponseDelay = false;

  makeGetRequest(url: string, headers: Headers): AbortableRequest {
    const nextResponse: Error | Response | undefined = this.queuedResponses.pop();
    let responsePromise: Promise<Response>;
    if (nextResponse === undefined) {
      responsePromise = Promise.reject('No responses queued');
    } else if (nextResponse instanceof Error) {
      responsePromise = Promise.reject(nextResponse);
    } else {
      if (this.simulateResponseDelay) {
        // Actual response will have some delay. This is required to get expected behavior for caching.
        responsePromise = new Promise(resolve => setTimeout(() => resolve(nextResponse), 50));
      } else {
        responsePromise = Promise.resolve(nextResponse);
      }
    }
    this.responsePromises.push(responsePromise);
    return { responsePromise, abort: jest.fn() };
  }
}

describe('reactNativeDatafileManager', () => {
  const MockedReactNativeAsyncStorageCache = jest.mocked(ReactNativeAsyncStorageCache);

  const testCache: PersistentKeyValueCache = {
    get(key: string): Promise<string | undefined> {
      let val = undefined;
      switch (key) {
        case 'opt-datafile-keyThatExists':
          val = JSON.stringify({ name: 'keyThatExists' });
          break;
      }
      return Promise.resolve(val);
    },
  
    set(): Promise<void> {
      return Promise.resolve();
    },
  
    contains(): Promise<boolean> {
      return Promise.resolve(false);
    },
  
    remove(): Promise<boolean> {
      return Promise.resolve(false);
    },
  };
  
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    MockedReactNativeAsyncStorageCache.mockClear();
    mockGet.mockClear();
    mockSet.mockClear();
    mockContains.mockClear();
    mockRemove.mockClear();
  });

  it('uses the user provided cache', async () => {
    const cache = {
      get: mockGet,
      set: mockSet, 
      contains: mockContains,
      remove: mockRemove,
    };

    const manager = new MockRequestReactNativeDatafileManager({
      sdkKey: 'keyThatExists',
      updateInterval: 500,
      autoUpdate: true,
      cache,
    });

    manager.simulateResponseDelay = true;

    manager.queuedResponses.push({
      statusCode: 200,
      body: '{"foo": "bar"}',
      headers: {},
    });
    manager.start();
    await manager.onReady();
    await advanceTimersByTime(50);
    expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
    expect(mockSet.mock.calls[0][0]).toEqual('opt-datafile-keyThatExists');
    expect(JSON.parse(mockSet.mock.calls[0][1])).toEqual({ foo: 'bar' });
  });
  
  it('uses ReactNativeAsyncStorageCache if no cache is provided', async () => {
    const manager = new MockRequestReactNativeDatafileManager({
      sdkKey: 'keyThatExists',
      updateInterval: 500,
      autoUpdate: true
    });
    manager.simulateResponseDelay = true;

    manager.queuedResponses.push({
      statusCode: 200,
      body: '{"foo": "bar"}',
      headers: {},
    });
    
    manager.start();
    await manager.onReady();
    await advanceTimersByTime(50);

    expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
    expect(mockSet.mock.calls[0][0]).toEqual('opt-datafile-keyThatExists');
    expect(JSON.parse(mockSet.mock.calls[0][1] as string)).toEqual({ foo: 'bar' });
  });
});
