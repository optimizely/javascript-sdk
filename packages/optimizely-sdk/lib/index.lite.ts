/**
 * Copyright 2021-2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 import {
    getLogger,
    setLogHandler,
    setLogLevel,
    setErrorHandler,
    getErrorHandler,
    LogLevel
  } from '@optimizely/js-sdk-logging';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import noOpEventDispatcher from './plugins/event_dispatcher/no_op';
import * as enums from './utils/enums';
import * as loggerPlugin from './plugins/logger';
import Optimizely from './optimizely';
import { createNotificationCenter } from './core/notification_center';
import { createForwardingEventProcessor } from './plugins/event_processor/forwarding_event_processor';
import { OptimizelyDecideOption, Client, ConfigLite } from './shared_types';
import { createNoOpDatafileManager } from './plugins/datafile_manager/no_op_datafile_manager';
  
const logger = getLogger();
setLogHandler(loggerPlugin.createLogger());
setLogLevel(LogLevel.ERROR);

/**
 * Creates an instance of the Optimizely class
 * @param  {ConfigLite} config
 * @return {Client|null} the Optimizely client object
 *                           null on error 
 */
 const createInstance = function(config: ConfigLite): Client | null {
  try {

    // TODO warn about setting per instance errorHandler / logger / logLevel
    let isValidInstance = false;

    if (config.errorHandler) {
      setErrorHandler(config.errorHandler);
    }
    if (config.logger) {
      setLogHandler(config.logger);
      // respect the logger's shouldLog functionality
      setLogLevel(LogLevel.NOTSET);
    }
    if (config.logLevel !== undefined) {
      setLogLevel(config.logLevel);
    }

    try {
      configValidator.validate(config);
      isValidInstance = true;
    } catch (ex) {
      logger.error(ex);
    }

    const errorHandler = getErrorHandler();
    const notificationCenter = createNotificationCenter({ logger: logger, errorHandler: errorHandler });
    const eventDispatcher = config.eventDispatcher || noOpEventDispatcher;
    const eventProcessor = createForwardingEventProcessor(eventDispatcher, notificationCenter);

    const optimizelyOptions = {
      clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
      ...config,
      logger,
      errorHandler,
      datafileManager: createNoOpDatafileManager(),
      eventProcessor,
      notificationCenter,
      isValidInstance: isValidInstance,
    };

    const optimizely = new Optimizely(optimizelyOptions);
    return optimizely;
  } catch (e) {
    logger.error(e);
    return null;
  }
};

export {
  loggerPlugin as logging,
  defaultErrorHandler as errorHandler,
  noOpEventDispatcher as eventDispatcher,
  enums,
  setLogHandler as setLogger,
  setLogLevel,
  createInstance,
  OptimizelyDecideOption,
};

export default {
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: noOpEventDispatcher,
  enums,
  setLogger: setLogHandler,
  setLogLevel,
  createInstance,
  OptimizelyDecideOption,
};

export * from './export_types'
