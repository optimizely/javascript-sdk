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

import { describe, beforeEach, afterEach, it, vi, expect, MockedObject } from 'vitest';

const { mockMap, mockGet, mockSet, mockRemove, mockContains } = vi.hoisted(() => {
  const mockMap = new Map();

  const mockGet = vi.fn().mockImplementation((key) => {
    console.log('getting ...', key, mockMap.get(key));
    return Promise.resolve(mockMap.get(key));
  });

  const mockSet = vi.fn().mockImplementation((key, value) => {
    mockMap.set(key, value);
    return Promise.resolve();
  });

  const mockRemove = vi.fn().mockImplementation((key) => {
    if (mockMap.has(key)) {
      mockMap.delete(key);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  });

  const mockContains = vi.fn().mockImplementation((key) => {
    return Promise.resolve(mockMap.has(key));
  });

  return { mockMap, mockGet, mockSet, mockRemove, mockContains };
});

vi.mock('../lib/plugins/key_value_cache/reactNativeAsyncStorageCache', () => {
  const MockReactNativeAsyncStorageCache = vi.fn();
  MockReactNativeAsyncStorageCache.prototype.get = mockGet;
  MockReactNativeAsyncStorageCache.prototype.set = mockSet;
  MockReactNativeAsyncStorageCache.prototype.contains = mockContains;
  MockReactNativeAsyncStorageCache.prototype.remove = mockRemove;
  return { 'default': MockReactNativeAsyncStorageCache };
});


import { advanceTimersByTime } from './testUtils';
import ReactNativeDatafileManager from '../lib/modules/datafile-manager/reactNativeDatafileManager';
import { Headers, AbortableRequest, Response } from '../lib/modules/datafile-manager/http';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';
import ReactNativeAsyncStorageCache from '../lib/plugins/key_value_cache/reactNativeAsyncStorageCache';

class MockRequestReactNativeDatafileManager extends ReactNativeDatafileManager {
  queuedResponses: (Response | Error)[] = [];

  responsePromises: Promise<Response>[] = [];

  simulateResponseDelay = false;

  makeGetRequest(url: string, headers: Headers): AbortableRequest {
    console.log('make get request is called');
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
    console.log(nextResponse, responsePromise);
    this.responsePromises.push(responsePromise);
    return { responsePromise, abort: vi.fn() };
  }
}

describe('reactNativeDatafileManager', () => {
  const MockedReactNativeAsyncStorageCache = vi.mocked(ReactNativeAsyncStorageCache);

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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    MockedReactNativeAsyncStorageCache.mockClear();
    mockGet.mockClear();
    mockSet.mockClear();
    mockContains.mockClear();
    mockRemove.mockClear();
  });

  it('uses the user provided cache', async () => {
    const setSpy = vi.spyOn(testCache, 'set');
    
    const manager = new MockRequestReactNativeDatafileManager({
      sdkKey: 'keyThatExists',
      updateInterval: 500,
      autoUpdate: true,
      cache: testCache,
    });

    manager.simulateResponseDelay = true;

    manager.queuedResponses.push({
      statusCode: 200,
      body: '{"foo": "bar"}',
      headers: {},
    });

    manager.start();
    vi.advanceTimersByTime(50);
    await manager.onReady();
    expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
    expect(setSpy.mock.calls[0][0]).toEqual('opt-datafile-keyThatExists');
    expect(JSON.parse(setSpy.mock.calls[0][1])).toEqual({ foo: 'bar' });
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
    vi.advanceTimersByTime(50);
    await manager.onReady();

    console.log('manager advanced');

    expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
    expect(mockSet.mock.calls[0][0]).toEqual('opt-datafile-keyThatExists');
    expect(JSON.parse(mockSet.mock.calls[0][1] as string)).toEqual({ foo: 'bar' });
  });
});
