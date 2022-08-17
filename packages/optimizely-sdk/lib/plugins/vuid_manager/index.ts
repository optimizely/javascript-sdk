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

import { uuid } from '../../utils/fns';
import PersistentKeyValueCache from '../key_value_cache/persistentKeyValueCache';

export interface IVuidManager {
  readonly vuid: string;
}

/**
 * Manager for creating, persisting, and retrieving a Visitor Unique Identifier
 */
export class VuidManager implements IVuidManager {
  /**
   * Unique key used within the persistent value cache against which to
   * store the VUID
   * @private
   */
  private _keyForVuid = 'optimizely-vuid';

  /**
   * Prefix used as part of the VUID format
   * @private
   */
  private readonly _prefix: string = `vuid_`;

  /**
   * Current VUID value being used
   * @private
   */
  private _vuid: string;

  /**
   * Get the current VUID value being used
   */
  public get vuid(): string {
    return this._vuid;
  }

  private constructor() {
    this._vuid = '';
  }

  /**
   * Instance of the VUID Manager
   * @private
   */
  private static _instance: VuidManager;

  /**
   * Gets the current instance of the VUID Manager, initializing if needed
   * @param cache Caching mechanism to use for persisting the VUID outside working memory   *
   * @returns An instance of VuidManager
   */
  public static async instance(cache: PersistentKeyValueCache): Promise<VuidManager> {
    if (!this._instance) {
      this._instance = new VuidManager();
    }

    if (!this._instance._vuid) {
      await this._instance.load(cache);
    }

    return this._instance;
  }

  /**
   * Attempts to load a VUID from persistent cache or generates a new VUID
   * @param cache Caching mechanism to use for persisting the VUID outside working memory
   * @returns Current VUID stored in the VuidManager
   */
  private async load(cache: PersistentKeyValueCache): Promise<string> {
    const cachedValue = await cache.get(this._keyForVuid);
    if (cachedValue && this.isVuid(cachedValue)) {
      this._vuid = cachedValue;
    } else {
      this._vuid = this.makeVuid();
      await this.save(this._vuid, cache);
    }

    return this._vuid;
  }

  /**
   * Creates a new VUID
   * @returns A new visitor unique identifier
   */
  private makeVuid(): string {
    const maxLength = 32;   // required by ODP server

    // make sure UUIDv4 is used (not UUIDv1 or UUIDv6) since the trailing 5 chars will be truncated. See TDD for details.
    const uuidV4 = uuid();
    const formatted = uuidV4.replace(/-/g, '').toLowerCase();
    const vuidFull = `${(this._prefix)}${formatted}`;

    return (vuidFull.length <= maxLength) ? vuidFull : vuidFull.substring(0, maxLength);
  }

  /**
   * Saves a VUID to a persistent cache
   * @param vuid VUID to be stored
   * @param cache Caching mechanism to use for persisting the VUID outside working memory
   */
  private async save(vuid: string, cache: PersistentKeyValueCache): Promise<void> {
    await cache.set(this._keyForVuid, vuid);
  }

  /**
   * Validates the format of a Visitor Unique Identifier
   * @param vuid VistorId to check
   * @returns *true* if the VisitorId is valid otherwise *false* for invalid
   */
  private isVuid = (vuid: string): boolean => vuid.startsWith(this._prefix);

  /**
   * Function used in unit testing to reset the VuidManager
   * **Important**: This should not to be used in production code
   */
  private static _reset(): void {
    this._instance._vuid = '';
  }
}
