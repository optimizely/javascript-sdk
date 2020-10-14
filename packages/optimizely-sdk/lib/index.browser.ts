/**
 * Copyright 2016-2017, 2019-2020 Optimizely
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
import { LocalStoragePendingEventsDispatcher } from '@optimizely/js-sdk-event-processor';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './plugins/event_dispatcher/index.browser';
import * as enums from './utils/enums';
import loggerPlugin from './plugins/logger';
import Optimizely from './optimizely';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';
import { OptimizelyOptions, SDKOptions } from './shared_types';

const logger = getLogger();
setLogHandler(loggerPlugin.createLogger());
setLogLevel(LogLevel.INFO);

const MODULE_NAME = 'INDEX_BROWSER';
const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s

let hasRetriedEvents = false;

/**
 * Creates an instance of the Optimizely class
 * @param  {SDKOptions} config
 * @return {Optimizely|null} the Optimizely object
 *                           null on error 
 */
const createInstance = function(config: SDKOptions): Optimizely | null {
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

    let eventDispatcher;
    // prettier-ignore
    if (config.eventDispatcher == null) { // eslint-disable-line eqeqeq
      // only wrap the event dispatcher with pending events retry if the user didnt override
      eventDispatcher = new LocalStoragePendingEventsDispatcher({
        eventDispatcher: defaultEventDispatcher,
      });

      if (!hasRetriedEvents) {
        eventDispatcher.sendPendingEvents();
        hasRetriedEvents = true;
      }
    } else {
      eventDispatcher = config.eventDispatcher;
    }

    const additionalEntities = {
      clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
      eventBatchSize: DEFAULT_EVENT_BATCH_SIZE,
      eventFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
      eventDispatcher: eventDispatcher
    };

    const optimizelyLoggers = {
      logger: logger,
      errorHandler: getErrorHandler(),
    };

    const modifiedConfig = {...additionalEntities, ...config, ...optimizelyLoggers};

    if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
      logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
      modifiedConfig.eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
    }
    if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
      logger.warn(
        'Invalid eventFlushInterval %s, defaulting to %s',
        config.eventFlushInterval,
        DEFAULT_EVENT_FLUSH_INTERVAL
      );
      modifiedConfig.eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
    }

    const optimizely = new Optimizely(modifiedConfig);

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
    } catch (e) {
      logger.error(enums.LOG_MESSAGES.UNABLE_TO_ATTACH_UNLOAD, MODULE_NAME, e.message);
    }

    return optimizely;
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
export {
  loggerPlugin as logging,
  defaultErrorHandler as errorHandler,
  defaultEventDispatcher as eventDispatcher,
  enums,
  setLogHandler as setLogger,
  setLogLevel,
  createInstance,
  __internalResetRetryState,
};

export default {
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums: enums,
  setLogger: setLogHandler,
  setLogLevel: setLogLevel,
  createInstance: createInstance,
  __internalResetRetryState: __internalResetRetryState,
};
