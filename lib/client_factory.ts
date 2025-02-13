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
    console.log('got error ', e);
    logger?.error(e);
    return null;
  }
}
