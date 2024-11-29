/**
 * Copyright 2022-2024, Optimizely
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

import { Maybe } from "../type";
import { AsyncCache } from "./cache";
import { asyncStorage } from "../import.react_native/@react-native-async-storage/async-storage";

export class AsyncStorageCache<V> implements AsyncCache<V> {
  public readonly operation = 'async';

  async get(key: string): Promise<V | undefined> {
    const value = await asyncStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  }

  async remove(key: string): Promise<unknown> {
    return asyncStorage.removeItem(key);
  }

  async set(key: string, val: V): Promise<unknown> {
    return asyncStorage.setItem(key, JSON.stringify(val));
  }

  async clear(): Promise<unknown> {
    return asyncStorage.clear();
  }

  async getKeys(): Promise<string[]> {
    return [... await asyncStorage.getAllKeys()];
  }

  async getBatched(keys: string[]): Promise<Maybe<V>[]> {
    const items = await asyncStorage.multiGet(keys);
    return items.map(([key, value]) => value ? JSON.parse(value) : undefined);
  }
}
