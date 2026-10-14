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

import { Platform } from '../../../platform_support';
import { loadAsyncStorageModule } from '../../../react_native_optional/async_storage';

export interface AsyncStorageCompat {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
  multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>;
}

interface RawAsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
  multiGet?(keys: readonly string[]): Promise<readonly [string, string | null][]>;
  getMany?(keys: readonly string[]): Promise<Record<string, string | null>>;
}

export const MODULE_NOT_FOUND_REACT_NATIVE_ASYNC_STORAGE = 'Module not found: @react-native-async-storage/async-storage';

type RawAsyncStorageWithGetMany = RawAsyncStorage & Required<Pick<RawAsyncStorage, 'getMany'>>;

// Returns a wrapper with the original as its prototype, so the shared AsyncStorage object is not mutated.
export const ensureMultiGet = (storage: RawAsyncStorage): AsyncStorageCompat => {
  if (storage.multiGet || !storage.getMany) {
    return storage as AsyncStorageCompat;
  }

  return Object.create(storage, {
    multiGet: {
      value: async function(
        this: RawAsyncStorageWithGetMany,
        keys: readonly string[],
      ): Promise<[string, string | null][]> {
        const record = await this.getMany(keys);
        return keys.map((key: string) => [key, record[key] ?? null] as [string, string | null]);
      },
    },
  });
};

export const getDefaultAsyncStorage = (): AsyncStorageCompat => {
  const storage = loadAsyncStorageModule()?.default as RawAsyncStorage | undefined;
  if (!storage) {
    throw new Error(MODULE_NOT_FOUND_REACT_NATIVE_ASYNC_STORAGE);
  }
  return ensureMultiGet(storage);
};

export const __platforms: Platform[] = ['__universal__'];
