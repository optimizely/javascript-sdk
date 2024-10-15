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

import { LogHandler, LogLevel } from '../../modules/logging';
import { VuidManagerOptions } from '../../shared_types';
import { uuid } from '../../utils/fns';
import PersistentKeyValueCache from '../key_value_cache/persistentKeyValueCache';

export interface IVuidManager {
  /**
   * Current VUID value being used
   * @returns Current VUID stored in the VuidManager
   */
  readonly vuid: string | undefined;
  /**
   * Indicates whether the VUID use is enabled
   * @returns *true* if the VUID use is enabled otherwise *false*
   */
  readonly vuidEnabled: boolean;
  /**
   * Initialize the VuidManager
   * @returns Promise that resolves when the VuidManager is initialized
   */
  initialize(): Promise<void>;
}

/**
 * Manager for creating, persisting, and retrieving a Visitor Unique Identifier
 */
export class VuidManager implements IVuidManager {
  /**
   * Handler for recording execution logs
   * @private
   */
  private readonly logger: LogHandler;

  /**
   * Prefix used as part of the VUID format
   * @public
   * @readonly
   */
  static readonly vuid_prefix: string = `vuid_`;

  /**
   * Unique key used within the persistent value cache against which to
   * store the VUID
   * @private
   */
  private _keyForVuid = 'optimizely-vuid';

  /**
   * Current VUID value being used
   * @private
   */
  private _vuid: string | undefined;

  /**
   * Get the current VUID value being used
   */
  get vuid(): string | undefined {
    if (!this._vuid) {
      this.logger.log(LogLevel.ERROR, 'VUID is not initialized. Please call initialize() before accessing the VUID.');
    }

    return this._vuid;
  }

  /**
   * Current state of the VUID use
    * @private
    */
  private _vuidEnabled = false;

  /**
   * Indicates whether the VUID use is enabled
   */
  get vuidEnabled(): boolean {
    return this._vuidEnabled;
  }

  /**
   * The cache used to store the VUID
   * @private
   * @readonly
   */
  private readonly cache: PersistentKeyValueCache;

  constructor(cache: PersistentKeyValueCache, options: VuidManagerOptions, logger: LogHandler) {
    this.cache = cache;
    this._vuidEnabled = options.enableVuid;
    this.logger = logger;
  }

  /**
   * Initialize the VuidManager
   * @returns Promise that resolves when the VuidManager is initialized
   */
  async initialize(): Promise<void> {
    if (!this.vuidEnabled) {
      await this.cache.remove(this._keyForVuid);
    }

    if (!this._vuid) {
      await this.load(this.cache);
    }
  }

  /**
   * Attempts to load a VUID from persistent cache or generates a new VUID
   * @param cache Caching mechanism to use for persisting the VUID outside working memory
   * @returns Current VUID stored in the VuidManager
   * @private
   */
  private async load(cache: PersistentKeyValueCache): Promise<string> {
    const cachedValue = await cache.get(this._keyForVuid);
    if (cachedValue && VuidManager.isVuid(cachedValue)) {
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
   * @private
   */
  private makeVuid(): string {
    const maxLength = 32; // required by ODP server

    // make sure UUIDv4 is used (not UUIDv1 or UUIDv6) since the trailing 5 chars will be truncated.
    const uuidV4 = uuid();
    const formatted = uuidV4.replace(/-/g, '').toLowerCase();
    const vuidFull = `${VuidManager.vuid_prefix}${formatted}`;

    return vuidFull.length <= maxLength ? vuidFull : vuidFull.substring(0, maxLength);
  }

  /**
   * Saves a VUID to a persistent cache
   * @param vuid VUID to be stored
   * @param cache Caching mechanism to use for persisting the VUID outside working memory
   * @private
   */
  private async save(vuid: string, cache: PersistentKeyValueCache): Promise<void> {
    await cache.set(this._keyForVuid, vuid);
  }

  /**
   * Validates the format of a Visitor Unique Identifier (VUID)
   * @param vuid VistorId to check
   * @returns *true* if the VisitorId is valid otherwise *false* for invalid
   */
  static isVuid = (vuid: string | undefined): boolean => vuid?.startsWith(VuidManager.vuid_prefix) || false;

  /**
   * Function used in unit testing to reset the VuidManager
   * **Important**: This should not to be used in production code
   * @private
   */
  private _reset(): void {
    this._vuid = '';
  }
}
