/**
 * Copyright 2024-2026, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Platform } from '../../platform_support';

// Optional import shim; see ../README.md.

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

type RawAsyncStorageWithGetMany = RawAsyncStorage & Required<Pick<RawAsyncStorage, 'getMany'>>;

// AsyncStorage v3 replaced multiGet with getMany. Returns a wrapper with the original as its prototype,
// so the shared AsyncStorage object is not mutated.
// multiGet avoids async/await, which would compile to a tslib helper import.
const ensureMultiGet = (storage: RawAsyncStorage): AsyncStorageCompat => {
  if (storage.multiGet || !storage.getMany) {
    return storage as AsyncStorageCompat;
  }

  return Object.create(storage, {
    multiGet: {
      value: function(
        this: RawAsyncStorageWithGetMany,
        keys: readonly string[],
      ): Promise<[string, string | null][]> {
        return this.getMany(keys).then((record) =>
          keys.map((key: string) => [key, record[key] ?? null] as [string, string | null])
        );
      },
    },
  });
};

export let isAvailable = true;

// The package's default export, with multiGet added when it is missing (v3).
let AsyncStorage: AsyncStorageCompat | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const storage: RawAsyncStorage | undefined = require('@react-native-async-storage/async-storage').default;
  AsyncStorage = storage ? ensureMultiGet(storage) : undefined;
} catch (e) {
  isAvailable = false;
}

export default AsyncStorage;

export const __platforms: Platform[] = ['__universal__'];
