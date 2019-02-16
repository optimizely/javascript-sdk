/****************************************************************************
 * Copyright 2016-2017, Optimizely, Inc. and contributors                   *
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
var core = require('@optimizely/js-sdk-core');
var configValidator = require('./utils/config_validator');
var defaultErrorHandler = require('./plugins/error_handler');
var defaultEventDispatcher = require('./plugins/event_dispatcher/index.node');
var enums = require('./utils/enums');
var fns = require('./utils/fns');
var jsonSchemaValidator = require('./utils/json_schema_validator');
var logger = require('./plugins/logger');
var sprintf = require('sprintf-js').sprintf;

var Optimizely = require('./optimizely');

var MODULE_NAME = 'INDEX';
core.setLogLevel(core.LogLevel.ERROR);

/**
 * Entry point into the Optimizely Node testing SDK
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
   * @param  {Object} config.jsonSchemaValidator
   * @param  {Object} config.logger
   * @param  {Object} config.userProfileService
   * @return {Object} the Optimizely object
   */
  createInstance: function(config) {
    try {
      var hasLogger = false;
      config = config || {};

      // TODO warn about setting per instance errorHandler / logger / logLevel
      if (config.errorHandler) {
        core.setErrorHandler(config.errorHandler);
      }
      if (config.logger) {
        // only set a logger in node if one is provided, by not setting we are noop-ing
        hasLogger = true;
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
        var errorMessage = sprintf('%s: %s', MODULE_NAME, ex.message);
        if (hasLogger) {
          core.getLogger().log(enums.LOG_LEVEL.ERROR, errorMessage);
        } else {
          core.createLogger().log(enums.LOG_LEVEL.ERROR, errorMessage);
        }
        config.isValidInstance = false;
      }

      config = fns.assign(
        {
          eventDispatcher: defaultEventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          skipJSONValidation: false,
        },
        config,
        {
          clientEngine: enums.NODE_CLIENT_ENGINE,
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
