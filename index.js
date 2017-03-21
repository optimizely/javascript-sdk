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
var _ = require('optimizely-server-sdk/node_modules/lodash/core');
var configValidator = require('optimizely-server-sdk/lib/utils/config_validator');
var defaultErrorHandler = require('optimizely-server-sdk/lib/plugins/error_handler');
var defaultEventDispatcher = require('./lib/plugins/event_dispatcher');
var enums = require('optimizely-server-sdk/lib/utils/enums');
var logger = require('optimizely-server-sdk/lib/plugins/logger');

var Optimizely = require('optimizely-server-sdk/lib/optimizely');

var JAVASCRIPT_CLIENT_VERSION = '1.3.3';
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
   * @return {Object} the Optimizely object
   * @throws If any of the config options that were passed in are invalid
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

    config = _.assignIn({
      clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
      clientVersion: JAVASCRIPT_CLIENT_VERSION,
      errorHandler: defaultErrorHandler,
      eventDispatcher: defaultEventDispatcher,
      logger: logger.createLogger({ logLevel: logLevel }),
    }, config);

    return new Optimizely(config);
  }
};
