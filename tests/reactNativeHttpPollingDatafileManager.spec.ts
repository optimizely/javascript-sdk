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

import { HttpPollingDatafileManager } from '../lib/modules/datafile-manager/index.react_native';
import { createHttpPollingDatafileManager } from '../lib/plugins/datafile_manager/react_native_http_polling_datafile_manager';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';
import { PersistentCacheProvider } from '../lib/shared_types';

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
    const fakePersistentCache : PersistentKeyValueCache = {
      contains(k: string): Promise<boolean> {
        return Promise.resolve(false);
      },
      get(key: string): Promise<string | undefined> {
        return Promise.resolve(undefined);
      },
      remove(key: string): Promise<boolean> {
        return Promise.resolve(false);
      },
      set(key: string, val: string): Promise<void> {
        return Promise.resolve()
      }
    }

    const fakePersistentCacheProvider = jest.fn().mockImplementation(() => {
      return fakePersistentCache;
    }) as jest.Mocked<PersistentCacheProvider>;

    const noop = () => {};

    createHttpPollingDatafileManager(
      'test-key',
      { log: noop, info: noop, debug: noop, error: noop, warn: noop },
      undefined,
      {},
      fakePersistentCacheProvider,
    )

    expect(MockedHttpPollingDatafileManager).toHaveBeenCalledTimes(1);

    const { cache } = MockedHttpPollingDatafileManager.mock.calls[0][0];
    expect(cache === fakePersistentCache).toBeTruthy();
  });
});
