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

export interface IVuidManager {
  makeVuid(): string;

  isVuid(visitorId: string): boolean;
}

export class VuidManager implements IVuidManager {
  keyForVuidMap = 'optimizely-odp';
  keyForVuid = 'vuid';
  prefix = `${(this.keyForVuid)}_`;

  public readonly vuid: string

  private constructor() {
    this.vuid = this.makeVuid();
  }

  private static instance: VuidManager;

  public static getInstance() : VuidManager {
    if (!this.instance) {
      this.instance = new VuidManager();
    }
    return this.instance;
  }

  public isVuid = (visitorId: string): boolean => visitorId.startsWith(this.prefix);

  public makeVuid(): string {
    const maxLength = 32;   // required by ODP server

    // make sure UUIDv4 is used (not UUIDv1 or UUIDv6) since the trailing 5 chars will be truncated. See TDD for details.
    const uuidV4 = uuid();
    const formatted = uuidV4.replace(/-/g, '', ).toLowerCase();
    const vuidFull = `${this.prefix}${formatted}`;

    return (vuidFull.length <= maxLength) ? vuidFull : vuidFull.substring(0, maxLength);
  }
}
