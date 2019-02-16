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
var core = require('@optimizely/js-sdk-core');
var fns = require('./utils/fns');
var configValidator = require('./utils/config_validator');
var defaultErrorHandler = require('./plugins/error_handler');
var defaultEventDispatcher = require('./plugins/event_dispatcher/index.browser');
var enums = require('./utils/enums');
var logger = require('./plugins/logger');
var Optimizely = require('./optimizely');

var MODULE_NAME = 'INDEX';
core.setLoggerBackend(core.createConsoleLogger());
core.setLogLevel(core.LogLevel.INFO);

/**
 * Entry point into the Optimizely Browser SDK
 */
module.exports = {
  logging: logger,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums: enums,

  /**
   * Creates an instance of the Optimizely class
   * @param  {Object} config
   * @param  {Object} config.datafile
   * @param  {Object} config.errorHandler
   * @param  {Object} config.eventDispatcher
   * @param  {Object} config.logger
   * @param  {Object} config.logLevel
   * @param  {Object} config.userProfileService
   * @return {Object} the Optimizely object
   */
  createInstance: function(config) {
    try {
      config = config || {};

      // TODO warn about setting per instance errorHandler / logger / logLevel
      if (config.errorHandler) {
        core.setErrorHandler(config.errorHandler);
      }
      if (config.logger) {
        core.setLoggerBackend(config.logger);
        // respect the logger's shouldLog functionality
        core.setLogLevel(core.LogLevel.NOTSET);
      }
      if (config.logLevel !== undefined) {
        core.setLogLevel(config.logLevel);
      }

      try {
        configValidator.validate(config);
        config.isValidInstance = true;
      } catch (ex) {
        core.getLogger().log(enums.LOG_LEVEL.ERROR, sprintf('%s: %s', MODULE_NAME, ex.message));
        config.isValidInstance = false;
      }

      // Explicitly check for null or undefined
      // prettier-ignore
      if (config.skipJSONValidation == null) { // eslint-disable-line eqeqeq
        config.skipJSONValidation = true;
      }

      config = fns.assignIn(
        {
          eventDispatcher: defaultEventDispatcher,
        },
        config,
        {
          clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
          // always get the OptimizelyLogger facade from core
          logger: core.getLogger(),
          errorHandler: core.getErrorHandler(),
        }
      );

      return new Optimizely(config);
    } catch (e) {
      core.getLogger().handleError(e);
      return null;
    }
  },
};
