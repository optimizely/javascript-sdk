/**
 * Copyright 2022-2023, Optimizely
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

import LRUCache, { ISegmentsCacheConfig, LRUCacheConfig } from './lru_cache';

export const BrowserLRUCacheConfig: ISegmentsCacheConfig = {
  DEFAULT_CAPACITY: 100,
  DEFAULT_TIMEOUT_SECS: 600,
};

export class BrowserLRUCache<K, V> extends LRUCache<K, V> {
  constructor(config?: LRUCacheConfig) {
    super({
      maxSize: config?.maxSize || BrowserLRUCacheConfig.DEFAULT_CAPACITY,
      timeout: config?.timeout || BrowserLRUCacheConfig.DEFAULT_TIMEOUT_SECS * 1000,
    });
  }
}
