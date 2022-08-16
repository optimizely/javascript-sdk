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
  load(cache: PersistentKeyValueCache): Promise<string>;

  save(vuid: string, cache: PersistentKeyValueCache): Promise<void>;

  makeVuid(): string;

  isVuid(visitorId: string): boolean;
}

export class VuidManager implements IVuidManager {
  private readonly _keyForVuidMap: string;
  public get keyForVuidMap(): string {
    return this._keyForVuidMap;
  }

  private readonly _keyForVuid: string;
  public get keyForVuid(): string {
    return this._keyForVuid;
  }

  private readonly _prefix: string;

  private _vuid: string;
  public get vuid(): string {
    return this._vuid;
  }

  private constructor() {
    this._keyForVuidMap = 'optimizely-odp';
    this._keyForVuid = 'vuid';
    this._prefix = `${(this._keyForVuid)}_`;
    this._vuid = '';
  }

  private static _instance: VuidManager;

  public static async instance(cache: PersistentKeyValueCache): Promise<VuidManager> {
    if (!this._instance) {
      this._instance = new VuidManager();
    }

    if (!this._instance._vuid) {
      await this._instance.load(cache);
    }

    return this._instance;
  }

  public async load(cache: PersistentKeyValueCache): Promise<string> {
    const cachedValue = await cache.get(this.keyForVuidMap);
    if (cachedValue) {
      const dict = cachedValue as Map<string, string>;
      if (dict.has(this.keyForVuid)) {
        const oldVuid = dict.get(this.keyForVuid);
        if (oldVuid) {
          this._vuid = oldVuid;
        }
      }
    } else {
      const newVuid = this.makeVuid();
      await this.save(newVuid, cache);
      this._vuid = newVuid;
    }
    return this._vuid;
  }

  public makeVuid(): string {
    const maxLength = 32;   // required by ODP server

    // make sure UUIDv4 is used (not UUIDv1 or UUIDv6) since the trailing 5 chars will be truncated. See TDD for details.
    const uuidV4 = uuid();
    const formatted = uuidV4.replace(/-/g, '').toLowerCase();
    const vuidFull = `${this._prefix}${formatted}`;

    return (vuidFull.length <= maxLength) ? vuidFull : vuidFull.substring(0, maxLength);
  }

  public async save(vuid: string, cache: PersistentKeyValueCache): Promise<void> {
    const dict = new Map<string, string>([[this.keyForVuid, vuid]]);
    await cache.set(this.keyForVuidMap, dict);
  }

  public isVuid = (visitorId: string): boolean => visitorId.startsWith(this._prefix);
}
