/**
 * Copyright 2022, Optimizely
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
import PersistentKeyValueCache from './persistentKeyValueCache';

export default class InMemoryStringCache implements PersistentKeyValueCache {
  private readonly data: Map<string, string>;

  private constructor() {
    this.data = new Map<string, string>();
  }

  private static instance: InMemoryStringCache;

  public static getInstance(): InMemoryStringCache {
    if (!this.instance) {
      this.instance = new InMemoryStringCache();
    }
    return this.instance;
  }

  contains(key: string): Promise<boolean> {
    return Promise.resolve(this.data.has(key));
  }

  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.data.get(key));
  }

  remove(key: string): Promise<boolean> {
    return Promise.resolve(this.data.delete(key));
  }

  set(key: string, val: string): Promise<void> {
    this.data.set(key, val);
    return Promise.resolve();
  }
}
