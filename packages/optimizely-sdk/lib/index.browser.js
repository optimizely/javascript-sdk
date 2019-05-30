/**
 * Copyright 2016-2017, Optimizely
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
require('promise-polyfill/dist/polyfill');
var logging = require('@optimizely/js-sdk-logging');
var fns = require('./utils/fns');
var configValidator = require('./utils/config_validator');
var defaultErrorHandler = require('./plugins/error_handler');
var defaultEventDispatcher = require('./plugins/event_dispatcher/index.browser');
var enums = require('./utils/enums');
var eventProcessor = require('@optimizely/js-sdk-event-processor');
var loggerPlugin = require('./plugins/logger');
var Optimizely = require('./optimizely');

var logger = logging.getLogger();
logging.setLogHandler(loggerPlugin.createLogger());
logging.setLogLevel(logging.LogLevel.INFO);

var hasRetriedEvents = false;
/**
 * Entry point into the Optimizely Browser SDK
 */
module.exports = {
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums: enums,

  setLogger: logging.setLogHandler,
  setLogLevel: logging.setLogLevel,

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
  createInstance: function(config) {
    try {
      config = config || {};

      // TODO warn about setting per instance errorHandler / logger / logLevel
      if (config.errorHandler) {
        logging.setErrorHandler(config.errorHandler);
      }
      if (config.logger) {
        logging.setLogHandler(config.logger);
        // respect the logger's shouldLog functionality
        logging.setLogLevel(logging.LogLevel.NOTSET);
      }
      if (config.logLevel !== undefined) {
        logging.setLogLevel(config.logLevel);
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

      var wrappedEventDispatcher = new eventProcessor.LocalStoragePendingEventsDispatcher({
        eventDispatcher: config.eventDispatcher || defaultEventDispatcher,
      });
      if (!hasRetriedEvents) {
        wrappedEventDispatcher.sendPendingEvents();
        hasRetriedEvents = true;
      }

      config = fns.assignIn({
        clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
      }, config, {
        eventDispatcher: wrappedEventDispatcher,
        // always get the OptimizelyLogger facade from logging
        logger: logger,
        errorHandler: logging.getErrorHandler(),
      });

      return new Optimizely(config);
    } catch (e) {
      logger.error(e);
      return null;
    }
  },

  __internalResetRetryState: function() {
    hasRetriedEvents = false;
  },
};
