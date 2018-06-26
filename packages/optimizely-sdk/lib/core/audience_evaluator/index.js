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
var conditionEvaluator = require('../condition_evaluator');

module.exports = {
  /**
   * Determine if the given user attributes satisfy the given audience conditions
   * @param  {Object[]} audiences            Audiences to match the user attributes against
   * @param  {Object[]} audiences.conditions Audience conditions to match the user attributes against
   * @param  {Object}   userAttributes       Hash representing user attributes which will be used in determining if
   *                                         the audience conditions are met
   * @return {Boolean}  True if the user attributes match the given audience conditions
   */
  evaluate: function(audiences, userAttributes) {
    // if there are no audiences, return true because that means ALL users are included in the experiment
    if (!audiences || audiences.length === 0) {
      return true;
    }

    // if no user attributes specified, return false
    if (!userAttributes) {
      return false;
    }

    for (var i = 0; i < audiences.length; i++) {
      var audience = audiences[i];
      var conditions = audience.conditions;
      if (conditionEvaluator.evaluate(conditions, userAttributes)) {
        return true;
      }
    }

    return false;
  },
};
