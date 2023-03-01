import { ERROR_MESSAGES } from './../../utils/enums/index';
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

import { tryWithLocalStorage } from '../../utils/local_storage/tryLocalStorage';
import PersistentKeyValueCache from './persistentKeyValueCache';
import { getLogger } from '../../modules/logging';

export default class BrowserAsyncStorageCache implements PersistentKeyValueCache {
  logger = getLogger();

  async contains(key: string): Promise<boolean> {
    return tryWithLocalStorage<boolean>({
      browserCallback: (localStorage: Storage) => {
        return localStorage.getItem(key) !== null;
      },
      nonBrowserCallback: () => {
        this.logger.error(ERROR_MESSAGES.LOCAL_STORAGE_DOES_NOT_EXIST);
        return false;
      },
    });
  }

  async get(key: string): Promise<string | null> {
    return tryWithLocalStorage<string | null>({
      browserCallback: (localStorage: Storage) => {
        return localStorage.getItem(key);
      },
      nonBrowserCallback: () => {
        this.logger.error(ERROR_MESSAGES.LOCAL_STORAGE_DOES_NOT_EXIST);
        return null;
      },
    });
  }

  async remove(key: string): Promise<boolean> {
    if (await this.contains(key)) {
      tryWithLocalStorage({
        browserCallback: (localStorage: Storage) => {
          localStorage.removeItem(key);
        },
        nonBrowserCallback: () => {
          this.logger.error(ERROR_MESSAGES.LOCAL_STORAGE_DOES_NOT_EXIST);
        },
      });
      return true;
    } else {
      return false;
    }
  }

  async set(key: string, val: string): Promise<void> {
    return tryWithLocalStorage({
      browserCallback: (localStorage: Storage) => {
        localStorage.setItem(key, val);
      },
      nonBrowserCallback: () => {
        this.logger.error(ERROR_MESSAGES.LOCAL_STORAGE_DOES_NOT_EXIST);
      },
    });
  }
}
