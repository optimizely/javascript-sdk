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

import { NodeRequestHandler } from "../utils/http_request_handler/request_handler.node";
import { getOpaquePollingConfigManager, OpaqueConfigManager, PollingConfigManagerConfig } from "./config_manager_factory";

export const __supportedPlatforms = ['node'] as const;

export const createPollingProjectConfigManager = (config: PollingConfigManagerConfig): OpaqueConfigManager => {
  const defaultConfig = {
    autoUpdate: true,
    requestHandler: new NodeRequestHandler(),
  };
  return getOpaquePollingConfigManager({ ...defaultConfig, ...config });
};
