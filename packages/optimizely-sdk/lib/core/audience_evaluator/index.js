/**
 * Copyright 2016, 2018 Optimizely
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
var conditionEvaluator = require('../condition_evaluator');
var customAttributeEvaluator = require('../custom_attribute_evaluator');

module.exports = {
  /**
   * Determine if the given user attributes satisfy the given audience conditions
   * @param  {Array}    audienceConditions    Audience conditions to match the user attributes against - can be an array
   *                                          of audience IDs, or a nested array of conditions
   *                                          Examples: ["5", "6"], ["and", ["or", "1", "2"], "3"]
   * @param  {Object}   audiencesById         Object providing access to full audience objects for audience IDs
   *                                          contained in audienceConditions. Keys should be audience IDs, values
   *                                          should be full audience objects with conditions properties
   * @param  {Object}   [userAttributes]      User attributes which will be used in determining if audience conditions
   *                                          are met. If not provided, defaults to an empty object
   * @return {Boolean}                        true if the user attributes match the given audience conditions, false
   *                                          otherwise
   */
  evaluate: function(audienceConditions, audiencesById, userAttributes) {
    // if there are no audiences, return true because that means ALL users are included in the experiment
    if (!audienceConditions || audienceConditions.length === 0) {
      return true;
    }

    if (!userAttributes) {
      userAttributes = {};
    }

    var customAttributeConditionEvaluator = function(condition) {
      return customAttributeEvaluator.evaluate(condition, userAttributes);
    };

    var audienceIdEvaluator = function(audienceId) {
      var audience = audiencesById[audienceId];
      if (audience) {
        return conditionEvaluator.evaluate(audience.conditions, customAttributeConditionEvaluator);
      }
      return null;
    };

    if (conditionEvaluator.evaluate(audienceConditions, audienceIdEvaluator)) {
      return true;
    }

    return false;
  },
};
