/****************************************************************************
 * Copyright 2017, Optimizely, Inc. and contributors                        *
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

/**
 * Provides utility method for validating that the given user profile service implementation is valid.
 */

var sprintf = require('sprintf-js').sprintf;

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;
var MODULE_NAME = 'USER_PROFILE_SERVICE_VALIDATOR';

module.exports = {
  /**
   * Validates user's provided user profile service instance
   * @param  {Object}  userProfileServiceInstance
   * @return {boolean} True if the instance is valid
   * @throws If the instance is not valid
   */
  validate: function(userProfileServiceInstance) {
    if (typeof userProfileServiceInstance.lookup !== 'function') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_PROFILE_SERVICE, MODULE_NAME, 'Missing function \'lookup\''));
    } else if (typeof userProfileServiceInstance.save !== 'function') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_PROFILE_SERVICE, MODULE_NAME, 'Missing function \'save\''));
    }
    return true;
  },
};
