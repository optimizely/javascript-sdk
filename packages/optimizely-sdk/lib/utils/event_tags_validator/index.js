/**
 * Copyright 2017, Optimizely
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
 * Provides utility method for validating that event tags user has provided are valid
 */

var sprintf = require('@optimizely/js-sdk-utils').sprintf;

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;
var MODULE_NAME = 'EVENT_TAGS_VALIDATOR';

module.exports = {
  /**
   * Validates user's provided event tags
   * @param  {Object}  event tags
   * @return {boolean} True if event tags are valid
   * @throws If event tags are not valid
   */
  validate: function(eventTags) {
    if (typeof eventTags === 'object' && !Array.isArray(eventTags) && eventTags !== null) {
      return true;
    } else {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_EVENT_TAGS, MODULE_NAME));
    }
  },
};
