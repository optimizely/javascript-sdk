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

export default class BrowserAsyncStorageCache implements PersistentKeyValueCache {
  async contains(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }

  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async remove(key: string): Promise<boolean> {
    if (await this.contains(key)) {
        localStorage.removeItem(key);
        return true;
      } else {
        return false;
      }
  }

  async set(key: string, val: string): Promise<void> {
    return localStorage.setItem(key, val);
  }
}
