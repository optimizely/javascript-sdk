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
var fns = require('./utils/fns');
var configValidator = require('./utils/config_validator');
var defaultErrorHandler = require('./plugins/error_handler');
var defaultEventDispatcher = require('./plugins/event_dispatcher/index.browser');
var enums = require('./utils/enums');
var logger = require('./plugins/logger');
var Optimizely = require('./optimizely');

var MODULE_NAME = 'INDEX';

/**
 * Entry point into the Optimizely Node testing SDK
 */
module.exports = {
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
    var logLevel = 'logLevel' in config ? config.logLevel : enums.LOG_LEVEL.INFO;
    var defaultLogger = logger.createLogger({ logLevel: enums.LOG_LEVEL.INFO });
    if (config) {
      try {
        configValidator.validate(config);
        config.isValidInstance = true;
      } catch (ex) {
        var errorMessage = MODULE_NAME + ':' + ex.message;
        if (config.logger) {
          config.logger.log(enums.LOG_LEVEL.ERROR, errorMessage);
        } else {
          defaultLogger.log(enums.LOG_LEVEL.ERROR, errorMessage);
        }
        config.isValidInstance = false;
      }
    }

    // Explicitly check for null or undefined
    if (config.skipJSONValidation == null) { // eslint-disable-line eqeqeq
      config.skipJSONValidation = true;
    }

    config = fns.assignIn({
      clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
      clientVersion: enums.CLIENT_VERSION,
      errorHandler: defaultErrorHandler,
      eventDispatcher: defaultEventDispatcher,
      logger: logger.createLogger({ logLevel: logLevel })
    }, config);

    return new Optimizely(config);
  }
};
