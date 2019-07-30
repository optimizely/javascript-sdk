/**
 * Copyright 2019, Optimizely
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
var MODULE_NAME = 'EXPERIMENT_KEYS_VALIDATOR';

/**
 * Provides utility method for validating that the experiment keys are given in a valid format.
 * TODO: add unit tests to check `validate` and `validateKey` functionality
 */

module.exports = {
    /**
     * Validates user's provided experiment keys
     * @param  {Object}  experimentKeys
     * @return {boolean} True if experimentKeys provided in valid format
     * @throws If experimentKeys is not valid
     */
    validate: function(experimentKeys) {
        if (!Array.isArray(experimentKeys)) {
            throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEYS, MODULE_NAME));
        }
        return true;
    }
};
