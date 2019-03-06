/**
 * Copyright 2016, 2018-2019 Optimizely
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
var conditionTreeEvaluator = require('../condition_tree_evaluator');
var customAttributeConditionEvaluator = require('../custom_attribute_condition_evaluator');
var enums = require('../../utils/enums');
var sprintf = require('@optimizely/js-sdk-utils').sprintf;

var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'AUDIENCE_EVALUATOR';

module.exports = {
  /**
   * Determine if the given user attributes satisfy the given audience conditions
   * @param  {Array|String|null|undefined}  audienceConditions    Audience conditions to match the user attributes against - can be an array
   *                                                              of audience IDs, a nested array of conditions, or a single leaf condition.
   *                                                              Examples: ["5", "6"], ["and", ["or", "1", "2"], "3"], "1"
   * @param  {Object}                       audiencesById         Object providing access to full audience objects for audience IDs
   *                                                              contained in audienceConditions. Keys should be audience IDs, values
   *                                                              should be full audience objects with conditions properties
   * @param  {Object}                       [userAttributes]      User attributes which will be used in determining if audience conditions
   *                                                              are met. If not provided, defaults to an empty object
   * @param  {Object}                       logger                Logger instance.
   * @return {Boolean}                                            true if the user attributes match the given audience conditions, false
   *                                                              otherwise
   */
  evaluate: function(audienceConditions, audiencesById, userAttributes, logger) {
    // if there are no audiences, return true because that means ALL users are included in the experiment
    if (!audienceConditions || audienceConditions.length === 0) {
      return true;
    }

    if (!userAttributes) {
      userAttributes = {};
    }

    var evaluateConditionWithUserAttributes = function(condition) {
      return customAttributeConditionEvaluator.evaluate(condition, userAttributes, logger);
    };

    var evaluateAudience = function(audienceId) {
      var audience = audiencesById[audienceId];
      if (audience) {
        logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.EVALUATING_AUDIENCE, MODULE_NAME, audienceId, JSON.stringify(audience.conditions)));
        var result = conditionTreeEvaluator.evaluate(audience.conditions, evaluateConditionWithUserAttributes);
        var resultText = result === null ? 'UNKNOWN' : result.toString().toUpperCase();
        logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT, MODULE_NAME, audienceId, resultText));
        return result;
      }

      return null;
    };

    return conditionTreeEvaluator.evaluate(audienceConditions, evaluateAudience) || false;
  },
};
