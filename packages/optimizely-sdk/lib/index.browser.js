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
import * as sdkLogging from '@optimizely/js-sdk-logging';
import { LocalStoragePendingEventsDispatcher } from '@optimizely/js-sdk-event-processor';

import fns from './utils/fns';
import Optimizely from './optimizely';
import utilEnums from './utils/enums';
import loggerPlugin from './plugins/logger';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './plugins/event_dispatcher/index.browser';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';

var logger = sdkLogging.getLogger();
sdkLogging.setLogHandler(loggerPlugin.createLogger());
sdkLogging.setLogLevel(sdkLogging.LogLevel.INFO);

var MODULE_NAME = 'INDEX_BROWSER';
var DEFAULT_EVENT_BATCH_SIZE = 10;
var DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s

var hasRetriedEvents = false;

export var logging = loggerPlugin;
export var errorHandler = defaultErrorHandler;
export var eventDispatcher = defaultEventDispatcher;
export var enums = utilEnums;
export var setLogger = sdkLogging.setLogHandler;
export var setLogLevel = sdkLogging.setLogLevel;

/**
 * Creates an instance of the Optimizely class
 * @param  {Object} config
 * @param  {Object} config.datafile
 * @param  {Object} config.errorHandler
 * @param  {Object} config.eventDispatcher
 * @param  {Object} config.logger
 * @param  {Object} config.logLevel
 * @param  {Object} config.userProfileService
 * @param {Object} config.eventBatchSize
 * @param {Object} config.eventFlushInterval
 * @return {Object} the Optimizely object
 */
export var createInstance = function(config) {
  try {
    config = config || {};

    // TODO warn about setting per instance errorHandler / logger / logLevel
    if (config.errorHandler) {
      sdkLogging.setErrorHandler(config.errorHandler);
    }
    if (config.logger) {
      sdkLogging.setLogHandler(config.logger);
      // respect the logger's shouldLog functionality
      sdkLogging.setLogLevel(sdkLogging.LogLevel.NOTSET);
    }
    if (config.logLevel !== undefined) {
      sdkLogging.setLogLevel(config.logLevel);
    }

    try {
      configValidator.validate(config);
      config.isValidInstance = true;
    } catch (ex) {
      logger.error(ex);
      config.isValidInstance = false;
    }

    // Explicitly check for null or undefined
    // prettier-ignore
    if (config.skipJSONValidation == null) { // eslint-disable-line eqeqeq
      config.skipJSONValidation = true;
    }

    var eventDispatcher;
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

    config = fns.assign(
      {
        clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
        eventBatchSize: DEFAULT_EVENT_BATCH_SIZE,
        eventFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
      },
      config,
      {
        eventDispatcher: eventDispatcher,
        // always get the OptimizelyLogger facade from logging
        logger: logger,
        errorHandler: sdkLogging.getErrorHandler(),
      }
    );

    if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
      logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
      config.eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
    }
    if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
      logger.warn(
        'Invalid eventFlushInterval %s, defaulting to %s',
        config.eventFlushInterval,
        DEFAULT_EVENT_FLUSH_INTERVAL
      );
      config.eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
    }

    var optimizely = new Optimizely(config);

    try {
      if (typeof window.addEventListener === 'function') {
        var unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
        window.addEventListener(
          unloadEvent,
          function() {
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

export var __internalResetRetryState = function() {
  hasRetriedEvents = false;
};

/**
 * Entry point into the Optimizely Browser SDK
 */
export default {
  logging,
  errorHandler,
  eventDispatcher,
  enums,
  setLogger,
  setLogLevel,
  createInstance,
  __internalResetRetryState,
};
