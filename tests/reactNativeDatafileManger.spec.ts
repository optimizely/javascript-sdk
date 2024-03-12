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

import ReactNativeDatafileManager from '../lib/modules/datafile-manager/reactNativeDatafileManager';
import { Headers, AbortableRequest, Response } from '../lib/modules/datafile-manager/http';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';
import { advanceTimersByTime, testPersistentCache } from './testUtils';

class MockRequestReactNativeDatafileManager extends ReactNativeDatafileManager {
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
  });

  it('uses the user provided cache', async () => {
    const cacheSetSpy = jest.spyOn(testPersistentCache, 'set');

    const manager = new MockRequestReactNativeDatafileManager({
      sdkKey: 'keyThatExists',
      updateInterval: 500,
      autoUpdate: true,
      cache: testPersistentCache,
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
    expect(cacheSetSpy.mock.calls[0][0]).toEqual('opt-datafile-keyThatExists');
    expect(JSON.parse(cacheSetSpy.mock.calls[0][1])).toEqual({ foo: 'bar' });

    cacheSetSpy.mockRestore();
  });
});
