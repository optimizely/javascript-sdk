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
  LogLevel
} from '@optimizely/js-sdk-logging';
import * as enums from './utils/enums';
import Optimizely from './optimizely';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import * as loggerPlugin from './plugins/logger/index.react_native';
import defaultEventDispatcher from './plugins/event_dispatcher/index.browser';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';
import { SDKOptions, OptimizelyDecideOption } from './shared_types';

const logger = getLogger();
setLogHandler(loggerPlugin.createLogger());
setLogLevel(LogLevel.INFO);

const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s
const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

/**
 * Creates an instance of the Optimizely class
 * @param  {SDKOptions} config
 * @return {Optimizely|null} the Optimizely object
 *                           null on error 
 */
const createInstance = function(config: SDKOptions): Optimizely | null {
  try {
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

    let eventBatchSize = config.eventBatchSize;
    let eventFlushInterval = config.eventFlushInterval;

    if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
      logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
      eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
    }
    if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
      logger.warn(
        'Invalid eventFlushInterval %s, defaulting to %s',
        config.eventFlushInterval,
        DEFAULT_EVENT_FLUSH_INTERVAL
      );
      eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
    }

    const optimizelyOptions = {
      clientEngine: enums.REACT_NATIVE_JS_CLIENT_ENGINE,
      eventDispatcher: defaultEventDispatcher,
      eventMaxQueueSize: DEFAULT_EVENT_MAX_QUEUE_SIZE,
      ...config,
      eventBatchSize: eventBatchSize,
      eventFlushInterval: eventFlushInterval,
      logger: logger,
      errorHandler: getErrorHandler()
    };

    // If client engine is react, convert it to react native.
    if (optimizelyOptions.clientEngine === enums.REACT_CLIENT_ENGINE) {
      optimizelyOptions.clientEngine = enums.REACT_NATIVE_CLIENT_ENGINE;
    }

    return new Optimizely(optimizelyOptions);
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
  OptimizelyDecideOption,
};

export default {
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums,
  setLogger: setLogHandler,
  setLogLevel,
  createInstance,
  OptimizelyDecideOption,
};
