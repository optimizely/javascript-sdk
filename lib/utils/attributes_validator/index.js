/**
 * Copyright 2016, Optimizely
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

/**
 * Provides utility method for validating that the attributes user has provided are valid
 */

var sprintf = require('sprintf');
var lodashForOwn = require('lodash/forOwn');

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;
var MODULE_NAME = 'ATTRIBUTES_VALIDATOR';

module.exports = {
  /**
   * Validates user's provided attributes
   * @param  {Object}  attributes
   * @return {boolean} True if the attributes are valid
   * @throws If the attributes are not valid
   */
  validate: function(attributes) {
    if (typeof attributes === 'object' && !Array.isArray(attributes) && attributes !== null) {
      lodashForOwn(attributes, function(value, key) {
        if (typeof value === 'undefined') {
          throw new Error(sprintf(ERROR_MESSAGES.UNDEFINED_ATTRIBUTE, MODULE_NAME, key));
        }
      });
      return true;
    } else {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, MODULE_NAME));
    }
  },
};
