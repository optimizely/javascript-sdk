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

var Optimizely = require('./optimizely');

var logger = core.getLogger('INDEX');
core.setLogLevel(core.LogLevel.ERROR);

/**
 * Entry point into the Optimizely Node testing SDK
 */
module.exports = {
  logging: require('./plugins/logger'),
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums: enums,

  setLogger: core.setLogHandler,
  setLogLevel: core.setLogLevel,

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
        core.setLogHandler(config.logger);
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
        if (hasLogger) {
          logger.error(ex);
        } else {
          console.error(ex.message);
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
          logger: logger,
          errorHandler: core.getErrorHandler(),
        }
      );

      return new Optimizely(config);
    } catch (e) {
      logger.error(e);
      return null;
    }
  },
};
