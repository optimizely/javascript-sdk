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

jest.mock('../lib/modules/datafile-manager/index.react_native', () => {
  return {
    HttpPollingDatafileManager: jest.fn().mockImplementation(() => {
      return {
        get(): string {
          return '{}';
        },
        on(): (() => void) {
          return () => {};
        },
        onReady(): Promise<void> {
          return Promise.resolve();
        },
      };
    }),
  }
});

import { advanceTimersByTime } from './testUtils';
import { HttpPollingDatafileManager } from '../lib/modules/datafile-manager/index.react_native';
import { createHttpPollingDatafileManager } from '../lib/plugins/datafile_manager/react_native_http_polling_datafile_manager';
import { Headers, AbortableRequest, Response } from '../lib/modules/datafile-manager/http';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';
import ReactNativeAsyncStorageCache from '../lib/plugins/key_value_cache/reactNativeAsyncStorageCache';

describe('createHttpPollingDatafileManager', () => {
  const MockedHttpPollingDatafileManager = jest.mocked(HttpPollingDatafileManager);

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    MockedHttpPollingDatafileManager.mockClear();
  });

  it('calls the provided persistentCacheFactory and passes it to the HttpPollingDatafileManagerConstructor', async () => {
    const fakePersistentCacheProvider = jest.fn()

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
