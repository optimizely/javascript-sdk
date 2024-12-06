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
import { isVuid, makeVuid } from './vuid';

export type VuidManagerOptions = {
  enableVuid: boolean;
}

export class VuidManager {
  private logger?: LogHandler;
  private vuidCacheKey = 'optimizely-vuid';
  private vuid?: string;
  private vuidEnabled = false;
  private cache: Cache<string>;
  private waitPromise: Promise<unknown> = Promise.resolve();

  getVuid(): string | undefined {
    return this.vuid;
  }

  isVuidEnabled(): boolean {
    return this.vuidEnabled;
  }

  constructor(cache: Cache<string>, logger?: LogHandler) {
    this.cache = cache;
    this.logger = logger;
  }

  setLogger(logger: LogHandler): void {
    this.logger = logger;
  }

  /**
   * Configures the VuidManager
   * @returns Promise that resolves when the VuidManager is configured
   */
  async configure(options: VuidManagerOptions): Promise<unknown> {
    const configureFn = async () => {
      this.vuidEnabled = options.enableVuid;
      
      if (!this.vuidEnabled) {
        await this.cache.remove(this.vuidCacheKey);
        this.vuid = undefined;
        return;
      }
  
      if (!this.vuid) {
        await this.initializeVuid();
      }
    }

    this.waitPromise = this.waitPromise.then(configureFn, configureFn);
    this.waitPromise.catch(() => {});
    return this.waitPromise;
  }

  /**
   * Attempts to load a VUID from persistent cache or generates a new VUID
   * and saves it in the cache
   * @private
   */
  private async initializeVuid(): Promise<void> {
    const cachedValue = await this.cache.get(this.vuidCacheKey);
    if (cachedValue && isVuid(cachedValue)) {
      this.vuid = cachedValue;
    } else {
      await this.save(makeVuid());
    }
  }

  private async save(vuid: string): Promise<void> {
    await this.cache.set(this.vuidCacheKey, vuid);
    this.vuid = vuid;
  }
}
