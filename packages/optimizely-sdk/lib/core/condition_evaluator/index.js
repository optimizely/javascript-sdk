/****************************************************************************
 * Copyright 2016, 2018, Optimizely, Inc. and contributors                   *
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

var AND_CONDITION = 'and';
var OR_CONDITION = 'or';
var NOT_CONDITION = 'not';

var DEFAULT_OPERATOR_TYPES = [AND_CONDITION, OR_CONDITION, NOT_CONDITION];

/**
 * TODO: update this
 * Top level method to evaluate audience conditions
 * @param  {Object[]|Object}  conditions Nested array of and/or conditions, or a single condition object
 *                            Example: ['and', { type: 'custom_attribute', ... }, ['or', { type: 'custom_attribute', ... }, { type: 'custom_attribute', ... }]]
 * @param  {Object}           userAttributes Hash representing user attributes which will be used in determining if
 *                            the audience conditions are met.
 * @return {?Boolean}         true/false if the given user attributes match/don't match the given conditions, null if
 *                            the given user attributes and conditions can't be evaluated
 */
function evaluate(conditions, leafEvaluator) {
  if (Array.isArray(conditions)) {
    var firstOperator = conditions[0];
    var restOfConditions = conditions.slice(1);

    if (DEFAULT_OPERATOR_TYPES.indexOf(firstOperator) === -1) {
      // Operator to apply is not explicit - assume 'or'
      firstOperator = OR_CONDITION;
      restOfConditions = conditions;
    }

    switch (firstOperator) {
      case AND_CONDITION:
        return andEvaluator(restOfConditions, leafEvaluator);
      case NOT_CONDITION:
        return notEvaluator(restOfConditions, leafEvaluator);
      default: // firstOperator is OR_CONDITION
        return orEvaluator(restOfConditions, leafEvaluator);
    }
  }

  var leafCondition = conditions;
  return leafEvaluator(leafCondition);
}

/**
 * TODO: update this
 * Evaluates an array of conditions as if the evaluator had been applied
 * to each entry and the results AND-ed together.
 * @param  {Object[]} conditions     Array of conditions ex: [operand_1, operand_2]
 * @param  {Object}   userAttributes Hash representing user attributes
 * @return {?Boolean}                true/false if the user attributes match/don't match the given conditions,
 *                                   null if the user attributes and conditions can't be evaluated
 */
function andEvaluator(conditions, leafEvaluator) {
  var sawNullResult = false;
  for (var i = 0; i < conditions.length; i++) {
    var conditionResult = evaluate(conditions[i], leafEvaluator);
    if (conditionResult === false) {
      return false;
    }
    if (conditionResult === null) {
      sawNullResult = true;
    }
  }
  return sawNullResult ? null : true;
}

/**
 * TODO: update this
 * Evaluates an array of conditions as if the evaluator had been applied
 * to a single entry and NOT was applied to the result.
 * @param  {Object[]} conditions     Array of conditions ex: [operand_1, operand_2]
 * @param  {Object}   userAttributes Hash representing user attributes
 * @return {?Boolean}                true/false if the user attributes match/don't match the given conditions,
 *                                   null if the user attributes and conditions can't be evaluated
 */
function notEvaluator(conditions, leafEvaluator) {
  if (conditions.length > 0) {
    var result = evaluate(conditions[0], leafEvaluator);
    return result === null ? null : !result;
  }
  return null;
}

/**
 * TODO: update this
 * Evaluates an array of conditions as if the evaluator had been applied
 * to each entry and the results OR-ed together.
 * @param  {Object[]} conditions     Array of conditions ex: [operand_1, operand_2]
 * @param  {Object}   userAttributes Hash representing user attributes
 * @return {?Boolean}                 true/false if the user attributes match/don't match the given conditions,
 *                                    null if the user attributes and conditions can't be evaluated
 */
function orEvaluator(conditions, leafEvaluator) {
  var sawNullResult = false;
  for (var i = 0; i < conditions.length; i++) {
    var conditionResult = evaluate(conditions[i], leafEvaluator);
    if (conditionResult === true) {
      return true;
    }
    if (conditionResult === null) {
      sawNullResult = true;
    }
  }
  return sawNullResult ? null : false;
}

module.exports = {
  evaluate: evaluate,
};
