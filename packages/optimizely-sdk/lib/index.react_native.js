/**
 * Copyright 2019, Optimizely
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
import fns from './utils/fns';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './plugins/event_dispatcher/index.browser';
import utilEnums from './utils/enums';
import loggerPlugin from './plugins/logger/index.react_native';
import Optimizely from './optimizely';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';

var logger = sdkLogging.getLogger();
sdkLogging.setLogHandler(loggerPlugin.createLogger());
sdkLogging.setLogLevel(sdkLogging.LogLevel.INFO);

var DEFAULT_EVENT_BATCH_SIZE = 10;
var DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s

export const logging = loggerPlugin;
export const errorHandler = defaultErrorHandler;
export const eventDispatcher = defaultEventDispatcher;
export const enums = utilEnums;
export const setLogger = sdkLogging.setLogHandler;
export const setLogLevel = sdkLogging.setLogLevel;

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
export const createInstance = function(config) {
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

    config = fns.assign(
      {
        clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
        eventBatchSize: DEFAULT_EVENT_BATCH_SIZE,
        eventDispatcher: defaultEventDispatcher,
        eventFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
      },
      config,
      {
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

    return new Optimizely(config);
  } catch (e) {
    logger.error(e);
    return null;
  }
}

/**
 * Entry point into the Optimizely Javascript SDK for React Native
 */
export default {
  logging,
  errorHandler,
  eventDispatcher,
  enums,
  setLogger,
  setLogLevel,
  createInstance,
};
