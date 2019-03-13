/**
 * Copyright 2016, 2018, 2019 Optimizely
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
var sprintf = require('@optimizely/js-sdk-utils').sprintf;

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;
var MODULE_NAME = 'CONFIG_VALIDATOR';
var DATAFILE_VERSIONS = require('../enums').DATAFILE_VERSIONS;

var SUPPORTED_VERSIONS = [
  DATAFILE_VERSIONS.V2,
  DATAFILE_VERSIONS.V3,
  DATAFILE_VERSIONS.V4
];

/**
 * Provides utility methods for validating that the configuration options are valid
 */
module.exports = {
  /**
   * Validates the given config options
   * @param  {Object} config
   * @param  {Object} config.errorHandler
   * @param  {Object} config.eventDispatcher
   * @param  {Object} config.logger
   * @return {Boolean} True if the config options are valid
   * @throws If any of the config options are not valid
   */
  validate: function(config) {
    if (config.errorHandler && (typeof config.errorHandler.handleError !== 'function')) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_ERROR_HANDLER, MODULE_NAME));
    }

    if (config.eventDispatcher && (typeof config.eventDispatcher.dispatchEvent !== 'function')) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_EVENT_DISPATCHER, MODULE_NAME));
    }

    if (config.logger && (typeof config.logger.log !== 'function')) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_LOGGER, MODULE_NAME));
    }

    return true;
  },

  /**
   * Validates the datafile
   * @param {string}  datafile
   * @return {Boolean} True if the datafile is valid
   * @throws If the datafile is not valid for any of the following reasons:
                - The datafile string is undefined
                - The datafile string cannot be parsed as a JSON object
                - The datafile version is not supported
   */
  validateDatafile: function(datafile) {
    if (!datafile) {
      throw new Error(sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, MODULE_NAME));
    }

    if (typeof datafile === 'string' || datafile instanceof String) {
      // Attempt to parse the datafile string
      try {
        datafile = JSON.parse(datafile);
      } catch (ex) {
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, MODULE_NAME));
      }
    }

    if (SUPPORTED_VERSIONS.indexOf(datafile.version) === -1) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_DATAFILE_VERSION, MODULE_NAME, datafile.version));
    }

    return true;
  }
};
