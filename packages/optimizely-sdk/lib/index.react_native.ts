/**
 * Copyright 2019-2020 Optimizely
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
  LogLevel,
  ErrorHandler,
  LogHandler,
} from '@optimizely/js-sdk-logging';

import * as enums from './utils/enums';
import { assign } from './utils/fns';
import { Optimizely, configObj } from './optimizely';
import * as configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import loggerPlugin from './plugins/logger/index.react_native';
import defaultEventDispatcher from './plugins/event_dispatcher/index.browser';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';
import * as projectConfig from './core/project_config';
import { EventDispatcher, UserProfileService } from './shared_types';

const logger = getLogger();
setLogHandler(loggerPlugin.createLogger());
setLogLevel(LogLevel.INFO);

const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s
const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

interface Config {
  datafile?: string;
  errorHandler?: ErrorHandler;
  eventDispatcher?: EventDispatcher;
  logger?: LogHandler;
  logLevel?: LogLevel;
  userProfileService?: UserProfileService;
  eventBatchSize?: number;
  eventFlushInterval?: number;
  sdkKey?: string;
  isValidInstance?: boolean;
}

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Optimizely} the Optimizely object
 */
const createInstance = function (config: Config): Optimizely | null {
  try {
    config = config || {};

    // TODO warn about setting per instance errorHandler / logger / logLevel
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
      config.isValidInstance = true;
    } catch (ex) {
      logger.error(ex);
      config.isValidInstance = false;
    }

    const optimizelyConfig = assign(
      {
        clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
        eventBatchSize: DEFAULT_EVENT_BATCH_SIZE,
        eventDispatcher: defaultEventDispatcher,
        eventMaxQueueSize: DEFAULT_EVENT_MAX_QUEUE_SIZE,
        eventFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
      },
      config,
      {
        // always get the OptimizelyLogger facade from logging
        logger: logger,
        errorHandler: getErrorHandler(),
      }
    ) as configObj;

    if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
      logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
      optimizelyConfig.eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
    }
    if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
      logger.warn(
        'Invalid eventFlushInterval %s, defaulting to %s',
        config.eventFlushInterval,
        DEFAULT_EVENT_FLUSH_INTERVAL
      );
      optimizelyConfig.eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
    }

    return new Optimizely(optimizelyConfig);
  } catch (e) {
    logger.error(e);
    return null;
  }
};

/**
 * Entry point into the Optimizely Javascript SDK for React Native
 */
export {
  loggerPlugin as logging,
  defaultErrorHandler as errorHandler,
  defaultEventDispatcher as eventDispatcher,
  enums,
  setLogHandler as setLogger,
  setLogLevel,
  createInstance,
};

export default {
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums: enums,
  setLogger: setLogHandler,
  setLogLevel: setLogLevel,
  createInstance: createInstance,
};
