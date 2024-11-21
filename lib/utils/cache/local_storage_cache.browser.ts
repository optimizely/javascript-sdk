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
import { SyncCache } from "./cache";

export class LocalStorageCache<V> implements SyncCache<V> {
  public readonly operation = 'sync';

  public set(key: string, value: V): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public get(key: string): Maybe<V> {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  }

  public remove(key: string): void {
    localStorage.removeItem(key);
  }

  public clear(): void {
    localStorage.clear();
  }

  public getKeys(): string[] {
    const keys: string[] = [];
    for(let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  getBatched(keys: string[]): Maybe<V>[] {
    return keys.map((k) => this.get(k));
  }
}
