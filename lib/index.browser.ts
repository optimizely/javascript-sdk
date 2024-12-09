/**
 * Copyright 2016-2017, 2019-2024 Optimizely
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

import logHelper from './modules/logging/logger';
import { getLogger, setErrorHandler, getErrorHandler, LogLevel } from './modules/logging';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './event_processor/event_dispatcher/default_dispatcher.browser';
import sendBeaconEventDispatcher from './event_processor/event_dispatcher/send_beacon_dispatcher.browser';
import * as enums from './utils/enums';
import * as loggerPlugin from './plugins/logger';
import { createNotificationCenter } from './notification_center';
import { OptimizelyDecideOption, Client, Config, OptimizelyOptions } from './shared_types';
import Optimizely from './optimizely';
import { UserAgentParser } from './odp/ua_parser/user_agent_parser';
import { getUserAgentParser } from './odp/ua_parser/ua_parser.browser';
import * as commonExports from './common_exports';
import { PollingConfigManagerConfig } from './project_config/config_manager_factory';
import { createPollingProjectConfigManager } from './project_config/config_manager_factory.browser';
import { createBatchEventProcessor, createForwardingEventProcessor } from './event_processor/event_processor_factory.browser';
import { createVuidManager } from './vuid/vuid_manager_factory.browser';
import { createOdpManager } from './odp/odp_manager_factory.browser';


const logger = getLogger();
logHelper.setLogHandler(loggerPlugin.createLogger());
logHelper.setLogLevel(LogLevel.INFO);

const MODULE_NAME = 'INDEX_BROWSER';
const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s
const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

let hasRetriedEvents = false;

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
const createInstance = function(config: Config): Client | null {
  try {
    // TODO warn about setting per instance errorHandler / logger / logLevel
    let isValidInstance = false;

    if (config.errorHandler) {
      setErrorHandler(config.errorHandler);
    }
    if (config.logger) {
      logHelper.setLogHandler(config.logger);
      // respect the logger's shouldLog functionality
      logHelper.setLogLevel(LogLevel.NOTSET);
    }
    if (config.logLevel !== undefined) {
      logHelper.setLogLevel(config.logLevel);
    }

    try {
      configValidator.validate(config);
      isValidInstance = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex) {
      logger.error(ex);
    }

    const errorHandler = getErrorHandler();
    const notificationCenter = createNotificationCenter({ logger: logger, errorHandler: errorHandler });

    const { clientEngine, clientVersion } = config;

    const optimizelyOptions: OptimizelyOptions = {
      ...config,
      clientEngine: clientEngine || enums.JAVASCRIPT_CLIENT_ENGINE,
      clientVersion: clientVersion || enums.CLIENT_VERSION,
      logger,
      errorHandler,
      notificationCenter,
      isValidInstance,
    };

    const optimizely = new Optimizely(optimizelyOptions);

    try {
      if (typeof window.addEventListener === 'function') {
        const unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
        window.addEventListener(
          unloadEvent,
          () => {
            optimizely.close();
          },
          false
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e) {
      logger.error(enums.LOG_MESSAGES.UNABLE_TO_ATTACH_UNLOAD, MODULE_NAME, e.message);
    }

    return optimizely;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e) {
    logger.error(e);
    return null;
  }
};

const __internalResetRetryState = function(): void {
  hasRetriedEvents = false;
};

/**
 * Entry point into the Optimizely Browser SDK
 */

const setLogHandler = logHelper.setLogHandler;
const setLogLevel = logHelper.setLogLevel;

export {
  loggerPlugin as logging,
  defaultErrorHandler as errorHandler,
  defaultEventDispatcher as eventDispatcher,
  sendBeaconEventDispatcher,
  enums,
  setLogHandler as setLogger,
  setLogLevel,
  createInstance,
  __internalResetRetryState,
  OptimizelyDecideOption,
  UserAgentParser as IUserAgentParser,
  getUserAgentParser,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
};

export * from './common_exports';

export default {
  ...commonExports,
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  sendBeaconEventDispatcher,
  enums,
  setLogger: setLogHandler,
  setLogLevel,
  createInstance,
  __internalResetRetryState,
  OptimizelyDecideOption,
  getUserAgentParser,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
};

export * from './export_types';
