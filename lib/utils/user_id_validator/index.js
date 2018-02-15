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
var enums = require('../enums');
var sprintf = require('sprintf');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var MODULE_NAME = 'USER_ID_VALIDATOR';

/**
 * Provides utility method for validating that the user ID provided is valid
 */

module.exports = {
  /**
   * Validates provided user ID
   * @param  {string}  userId
   * @return {boolean} True if the user ID is valid
   * @throws If the user ID not valid
   */
  validate: function(userId) {
    if (typeof userId !== 'string' || userId === '') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_ID, MODULE_NAME));
    } else {
      return true;
    }
  },
};
