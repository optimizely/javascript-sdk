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
import { Client, Config } from "./shared_types";
import { extractLogger } from "./logging/logger_factory";
import { extractErrorNotifier } from "./error/error_notifier_factory";
import { extractConfigManager } from "./project_config/config_manager_factory";
import { extractEventProcessor } from "./event_processor/event_processor_factory";
import { extractOdpManager } from "./odp/odp_manager_factory";
import { extractVuidManager } from "./vuid/vuid_manager_factory";
import { RequestHandler } from "./utils/http_request_handler/http";
import { CLIENT_VERSION, DEFAULT_CMAB_CACHE_SIZE, DEFAULT_CMAB_CACHE_TIMEOUT, JAVASCRIPT_CLIENT_ENGINE } from "./utils/enums";
import Optimizely from "./optimizely";
import { DefaultCmabClient } from "./core/decision_service/cmab/cmab_client";
import { CmabCacheValue, DefaultCmabService } from "./core/decision_service/cmab/cmab_service";
import { InMemoryLruCache } from "./utils/cache/in_memory_lru_cache";

export type OptimizelyFactoryConfig = Config & {
  requestHandler: RequestHandler;
}

export const getOptimizelyInstance = (config: OptimizelyFactoryConfig): Client => {
  const { 
    clientEngine,
    clientVersion,
    jsonSchemaValidator,
    userProfileService,
    userProfileServiceAsync,
    defaultDecideOptions,
    disposable,
    requestHandler,
  } = config;
  
  const projectConfigManager = extractConfigManager(config.projectConfigManager);
  const eventProcessor = extractEventProcessor(config.eventProcessor);
  const odpManager = extractOdpManager(config.odpManager);
  const vuidManager = extractVuidManager(config.vuidManager);
  const errorNotifier = extractErrorNotifier(config.errorNotifier);
  const logger = extractLogger(config.logger);

  const cmabClient = new DefaultCmabClient({
    requestHandler,
  });

  const cmabService = new DefaultCmabService({
    cmabClient,
    cmabCache: new InMemoryLruCache<CmabCacheValue>(DEFAULT_CMAB_CACHE_SIZE, DEFAULT_CMAB_CACHE_TIMEOUT),
  });

  const optimizelyOptions = {
    cmabService,
    clientEngine: clientEngine || JAVASCRIPT_CLIENT_ENGINE,
    clientVersion: clientVersion || CLIENT_VERSION,
    jsonSchemaValidator,
    userProfileService,
    userProfileServiceAsync,
    defaultDecideOptions,
    disposable,
    logger,
    errorNotifier,
    projectConfigManager,
    eventProcessor,
    odpManager,
    vuidManager,
  };

  return new Optimizely(optimizelyOptions);
}
