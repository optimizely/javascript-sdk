/**
 * Copyright 2024, Optimizely
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

import { Cache } from '../utils/cache/cache';
import { VuidManager } from './vuid_manager';

export type VuidManagerOptions = {
  vuidCache?: Cache<string>;
  enableVuid?: boolean;
}

const vuidManagerSymbol: unique symbol = Symbol();

export type OpaqueVuidManager = {
  [vuidManagerSymbol]: unknown;
};

export const extractVuidManager = (opaqueVuidManager: OpaqueVuidManager): VuidManager => { 
  return opaqueVuidManager[vuidManagerSymbol] as VuidManager;
};

export const wrapVuidManager = (vuidManager: VuidManager): OpaqueVuidManager => {
  return {
    [vuidManagerSymbol]: vuidManager
  }
};
