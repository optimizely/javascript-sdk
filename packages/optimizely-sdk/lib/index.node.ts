/****************************************************************************
 * Copyright 2016-2017, 2019-2022 Optimizely, Inc. and contributors        *
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
import Optimizely from './optimizely';
import * as enums from './utils/enums';
import * as loggerPlugin from './plugins/logger';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './plugins/event_dispatcher/index.node';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';
import { createNotificationCenter } from './core/notification_center';
import { createEventProcessor } from './plugins/event_processor';
import { OptimizelyDecideOption, Client, Config } from './shared_types';
import { createHttpPollingDatafileManager } from './plugins/datafile_manager/http_polling_datafile_manager';

const logger = getLogger();
setLogLevel(LogLevel.ERROR);

const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 30000; // Unit is ms, default is 30s
const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error 
 */
 const createInstance = function(config: Config): Client | null {
  try {
    let hasLogger = false;
    let isValidInstance = false;

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
      isValidInstance = true;
    } catch (ex) {
      if (hasLogger) {
        logger.error(ex);
      } else {
        console.error(ex.message);
      }
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

    const errorHandler = getErrorHandler();
    const notificationCenter = createNotificationCenter({ logger: logger, errorHandler: errorHandler });

    const eventProcessorConfig = {
      dispatcher: config.eventDispatcher || defaultEventDispatcher,
      flushInterval: eventFlushInterval,
      batchSize: eventBatchSize,
      maxQueueSize:  config.eventMaxQueueSize || DEFAULT_EVENT_MAX_QUEUE_SIZE,
      notificationCenter,
    }

    const eventProcessor = createEventProcessor(eventProcessorConfig);

    const optimizelyOptions = {
      clientEngine: enums.NODE_CLIENT_ENGINE,
      ...config,
      eventProcessor,
      logger,
      errorHandler,
      datafileManager: config.sdkKey ? createHttpPollingDatafileManager(config.sdkKey, logger, config.datafile, config.datafileOptions) : undefined,
      notificationCenter,
      isValidInstance: isValidInstance,
    };

    return new Optimizely(optimizelyOptions);
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

export * from './export_types'
