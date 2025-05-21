/**
 * Copyright 2025, Optimizely
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

import { getOpaquePollingConfigManager, OpaqueConfigManager, PollingConfigManagerConfig } from "./config_manager_factory";
import { RequestHandler } from "../utils/http_request_handler/http";
import { validateRequestHandler } from "../utils/http_request_handler/request_handler_validator";

export type UniversalPollingConfigManagerConfig = PollingConfigManagerConfig & {
  requestHandler: RequestHandler;
}

export const createPollingProjectConfigManager = (config: UniversalPollingConfigManagerConfig): OpaqueConfigManager => {
  validateRequestHandler(config.requestHandler);
  const defaultConfig = {
    autoUpdate: true,
  };
  return getOpaquePollingConfigManager({ ...defaultConfig, ...config });
};
