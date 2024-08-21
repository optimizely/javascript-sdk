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
import { describe, beforeEach, it, vi, expect } from 'vitest';

vi.mock('../lib/modules/event_processor/reactNativeEventsStore');

import { ReactNativeEventsStore } from '../lib/modules/event_processor/reactNativeEventsStore';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';
import { LogTierV1EventProcessor } from '../lib/modules/event_processor/index.react_native';
import { PersistentCacheProvider } from '../lib/shared_types';

describe('LogTierV1EventProcessor', () => {
  const MockedReactNativeEventsStore = vi.mocked(ReactNativeEventsStore);

  beforeEach(() => {
    MockedReactNativeEventsStore.mockClear();
  });

  it('calls the provided persistentCacheFactory and passes it to the ReactNativeEventStore constructor twice', async () => {
    const getFakePersistentCache = () : PersistentKeyValueCache => {
        return {
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
        };
    }

    let call = 0;
    const fakeCaches = [getFakePersistentCache(), getFakePersistentCache()];
    const fakePersistentCacheProvider = vi.fn().mockImplementation(() => {
      return fakeCaches[call++];
    });

    const noop = () => {};

    new LogTierV1EventProcessor({
      dispatcher: { dispatchEvent: () => {} },
      persistentCacheProvider: fakePersistentCacheProvider,
    })

    expect(fakePersistentCacheProvider).toHaveBeenCalledTimes(2);
    expect(MockedReactNativeEventsStore.mock.calls[0][2] === fakeCaches[0]).toBeTruthy();
    expect(MockedReactNativeEventsStore.mock.calls[1][2] === fakeCaches[1]).toBeTruthy();
  });
});
