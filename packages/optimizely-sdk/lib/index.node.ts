/****************************************************************************
 * Copyright 2016-2017, 2019-2020 Optimizely, Inc. and contributors        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import {
  getLogger,
  setLogHandler,
  setLogLevel,
  setErrorHandler,
  getErrorHandler,
  LogLevel
} from '@optimizely/js-sdk-logging';
import { assign } from './utils/fns';
import Optimizely from './optimizely';
import * as enums from './utils/enums';
import loggerPlugin from './plugins/logger';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './plugins/event_dispatcher/index.node';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';
import { configObj, Config } from './shared_types';

const logger = getLogger();
setLogLevel(LogLevel.ERROR);

const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 30000; // Unit is ms, default is 30s

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Optimizely} the Optimizely object
 */
const createInstance = function(config: Config): Optimizely | null {
  try {
    let hasLogger = false;
    config = config || {};

    // TODO warn about setting per instance errorHandler / logger / logLevel
    if (config.errorHandler) {
      setErrorHandler(config.errorHandler);
    }
    if (config.logger) {
      // only set a logger in node if one is provided, by not setting we are noop-ing
      hasLogger = true;
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
      if (hasLogger) {
        logger.error(ex);
      } else {
        console.error(ex.message);
      }
      config.isValidInstance = false;
    }

    const internalConfig = assign(
      {
        clientEngine: enums.NODE_CLIENT_ENGINE,
        eventBatchSize: DEFAULT_EVENT_BATCH_SIZE,
        eventDispatcher: defaultEventDispatcher,
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
      internalConfig.eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
    }
    if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
      logger.warn(
        'Invalid eventFlushInterval %s, defaulting to %s',
        config.eventFlushInterval,
        DEFAULT_EVENT_FLUSH_INTERVAL
      );
      internalConfig.eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
    }

    return new Optimizely(internalConfig);
  } catch (e) {
    logger.error(e);
    return null;
  }
};

/**
 * Entry point into the Optimizely Node testing SDK
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
