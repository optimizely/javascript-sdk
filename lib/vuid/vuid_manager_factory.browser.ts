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
import { DefaultVuidManger, VuidCacheManager, VuidManager } from './vuid_manager';
import { LocalStorageCache } from '../utils/cache/local_storage_cache.browser';
import { VuidManagerOptions } from './vuid_manager_factory';

export const vuidCacheManager = new VuidCacheManager(new LocalStorageCache<string>());

export const createVuidManager = (options: VuidManagerOptions): VuidManager => {
  return new DefaultVuidManger({
    vuidCacheManager,
    enableVuid: options.enableVuid
  });
}
