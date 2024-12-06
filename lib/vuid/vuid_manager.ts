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
import { LogHandler } from '../modules/logging';
import { Cache } from '../utils/cache/cache';
import { AsyncProducer, Maybe } from '../utils/type';
import { isVuid, makeVuid } from './vuid';

export interface VuidManager {
  getVuid(): Maybe<string>;
  isVuidEnabled(): boolean;
  initialize(): Promise<void>;
}

export class VuidCacheManager {
  private logger?: LogHandler;
  private vuidCacheKey = 'optimizely-vuid';
  private cache: Cache<string>;
  // if this value is not undefined, this means the same value is in the cache
  // if this is undefined, it could either mean that there is no value in the cache
  // or that there is a value in the cache but it has not been loaded yet
  private vuid?: string;
  private waitPromise: Promise<unknown> = Promise.resolve();

  constructor(cache: Cache<string>, logger?: LogHandler) {
    this.cache = cache;
    this.logger = logger;
  }

  setLogger(logger: LogHandler): void {
    this.logger = logger;
  }

  async serialize<T>(fn: AsyncProducer<T>): Promise<T> {
    const resultPromise = this.waitPromise.then(fn, fn);
    this.waitPromise = resultPromise.catch(() => {});
    return resultPromise;
  }

  async remove(): Promise<unknown> {
    const removeFn = async () => {
      this.vuid = undefined;
      await this.cache.remove(this.vuidCacheKey);
    }

    return this.serialize(removeFn);
  }

  async load(): Promise<string> {
    if (this.vuid) {
      return this.vuid;
    }

    const cachedValue = await this.cache.get(this.vuidCacheKey);
    if (cachedValue && isVuid(cachedValue)) {
      this.vuid = cachedValue;
      return this.vuid;
    }

    const saveFn = async () => {
      const newVuid = makeVuid();
      await this.cache.set(this.vuidCacheKey, newVuid);
      this.vuid = newVuid;
      return newVuid;
    }
    return this.serialize(saveFn);
  }
}

export type VuidManagerConfig = {
  enableVuid?: boolean;
  vuidCacheManager: VuidCacheManager;
}

export class DefaultVuidManger implements VuidManager {
  private vuidCacheManager: VuidCacheManager;
  private logger?: LogHandler;
  private vuid?: string;
  private vuidEnabled = false;
  private initialized = false;

  constructor(config: VuidManagerConfig) {
    this.vuidCacheManager = config.vuidCacheManager;
    this.vuidEnabled = config.enableVuid || false;
  }

  getVuid(): Maybe<string> {
    return this.vuid;
  }

  isVuidEnabled(): boolean {
    return this.vuidEnabled;
  }

  /**
   * initializes the VuidManager
   * @returns Promise that resolves when the VuidManager is initialized
   */
  async initialize(): Promise<void> {      
    if (!this.vuidEnabled) {
      await this.vuidCacheManager.remove();
      this.initialized = true;
      return;
    }

    this.vuid = await this.vuidCacheManager.load();
    this.initialized = true;
  }
}
