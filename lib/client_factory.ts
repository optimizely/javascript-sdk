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

import { LoggerFacade } from "./logging/logger";
import { Client, Config } from "./shared_types";
import { Maybe } from "./utils/type";
import configValidator from './utils/config_validator';
import { extractLogger } from "./logging/logger_factory";
import { extractErrorNotifier } from "./error/error_notifier_factory";
import { extractConfigManager } from "./project_config/config_manager_factory";
import { extractEventProcessor } from "./event_processor/event_processor_factory";
import { extractOdpManager } from "./odp/odp_manager_factory";
import { extractVuidManager } from "./vuid/vuid_manager_factory";

import { CLIENT_VERSION, JAVASCRIPT_CLIENT_ENGINE } from "./utils/enums";
import Optimizely from "./optimizely";

export const getOptimizelyInstance = (config: Config): Client | null => {
  let logger: Maybe<LoggerFacade>;

  try {
    logger = config.logger ? extractLogger(config.logger) : undefined;

    configValidator.validate(config);
    
    const { 
      clientEngine,
      clientVersion,
      jsonSchemaValidator,
      userProfileService,
      defaultDecideOptions,
      disposable,
    } = config;
    
    const errorNotifier = config.errorNotifier ? extractErrorNotifier(config.errorNotifier) : undefined;

    const projectConfigManager = extractConfigManager(config.projectConfigManager);
    const eventProcessor = config.eventProcessor ? extractEventProcessor(config.eventProcessor) : undefined;
    const odpManager = config.odpManager ? extractOdpManager(config.odpManager) : undefined;
    const vuidManager = config.vuidManager ? extractVuidManager(config.vuidManager) : undefined;

    const optimizelyOptions = {
      clientEngine: clientEngine || JAVASCRIPT_CLIENT_ENGINE,
      clientVersion: clientVersion || CLIENT_VERSION,
      jsonSchemaValidator,
      userProfileService,
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
  } catch (e) {
    logger?.error(e);
    return null;
  }
}
