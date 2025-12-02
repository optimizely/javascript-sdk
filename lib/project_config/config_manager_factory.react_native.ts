/**
 * Copyright 2024-2025, Optimizely
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

import { AsyncStorageCache } from "../utils/cache/async_storage_cache.react_native";
import { BrowserRequestHandler } from "../utils/http_request_handler/request_handler.browser";
import { getOpaquePollingConfigManager, PollingConfigManagerConfig, OpaqueConfigManager } from "./config_manager_factory";
import { Platform } from '../platform_support';

export const createPollingProjectConfigManager = (config: PollingConfigManagerConfig): OpaqueConfigManager => {
  const defaultConfig = {
    autoUpdate: true,
    requestHandler: new BrowserRequestHandler(),
    cache: config.cache || new AsyncStorageCache(),
  };
  
  return getOpaquePollingConfigManager({ ...defaultConfig, ...config });
};

export const __platforms: Platform[] = ['react_native'];
