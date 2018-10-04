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

var CUSTOM_ATTRIBUTE_CONDITION_TYPE = 'custom_attribute';

var EXACT_MATCH_TYPE = 'exact';
var EXISTS_MATCH_TYPE = 'exists';
var GREATER_THAN_MATCH_TYPE = 'gt';
var LESS_THAN_MATCH_TYPE = 'lt';
var SUBSTRING_MATCH_TYPE = 'substring';

var MATCH_TYPES = [
  EXACT_MATCH_TYPE,
  EXISTS_MATCH_TYPE,
  GREATER_THAN_MATCH_TYPE,
  LESS_THAN_MATCH_TYPE,
  SUBSTRING_MATCH_TYPE,
];

var EVALUATORS_BY_MATCH_TYPE = {};
EVALUATORS_BY_MATCH_TYPE[EXACT_MATCH_TYPE] = exactEvaluator;
EVALUATORS_BY_MATCH_TYPE[EXISTS_MATCH_TYPE] = existsEvaluator;
EVALUATORS_BY_MATCH_TYPE[GREATER_THAN_MATCH_TYPE] = greaterThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[LESS_THAN_MATCH_TYPE] = lessThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[SUBSTRING_MATCH_TYPE] = substringEvaluator;

var EXACT_MATCH_ALLOWED_TYPES = ['string', 'number', 'boolean'];

/**
 * Top level method to evaluate audience conditions
 * @param  {Object[]|Object}  conditions Nested array of and/or conditions, or a single condition object
 *                            Example: ['and', { type: 'custom_attribute', ... }, ['or', { type: 'custom_attribute', ... }, { type: 'custom_attribute', ... }]]
 * @param  {Object}           userAttributes Hash representing user attributes which will be used in determining if
 *                            the audience conditions are met.
 * @return {?Boolean}         true/false if the given user attributes match/don't match the given conditions, null if
 *                            the given user attributes and conditions can't be evaluated
 */
function evaluate(conditions, userAttributes) {
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
        return andEvaluator(restOfConditions, userAttributes);
      case NOT_CONDITION:
        return notEvaluator(restOfConditions, userAttributes);
      default: // firstOperator is OR_CONDITION
        return orEvaluator(restOfConditions, userAttributes);
    }
  }

  var leafCondition = conditions;

  if (leafCondition.type !== CUSTOM_ATTRIBUTE_CONDITION_TYPE) {
    return null;
  }

  var conditionMatch = leafCondition.match;
  if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
    return null;
  }

  var evaluatorForMatch = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || exactEvaluator;
  return evaluatorForMatch(leafCondition, userAttributes);
}

/**
 * Evaluates an array of conditions as if the evaluator had been applied
 * to each entry and the results AND-ed together.
 * @param  {Object[]} conditions     Array of conditions ex: [operand_1, operand_2]
 * @param  {Object}   userAttributes Hash representing user attributes
 * @return {?Boolean}                true/false if the user attributes match/don't match the given conditions,
 *                                   null if the user attributes and conditions can't be evaluated
 */
function andEvaluator(conditions, userAttributes) {
  var sawNullResult = false;
  for (var i = 0; i < conditions.length; i++) {
    var conditionResult = evaluate(conditions[i], userAttributes);
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
 * Evaluates an array of conditions as if the evaluator had been applied
 * to a single entry and NOT was applied to the result.
 * @param  {Object[]} conditions     Array of conditions ex: [operand_1, operand_2]
 * @param  {Object}   userAttributes Hash representing user attributes
 * @return {?Boolean}                true/false if the user attributes match/don't match the given conditions,
 *                                   null if the user attributes and conditions can't be evaluated
 */
function notEvaluator(conditions, userAttributes) {
  if (conditions.length > 0) {
    var result = evaluate(conditions[0], userAttributes);
    return result === null ? null : !result;
  }
  return null;
}

/**
 * Evaluates an array of conditions as if the evaluator had been applied
 * to each entry and the results OR-ed together.
 * @param  {Object[]} conditions     Array of conditions ex: [operand_1, operand_2]
 * @param  {Object}   userAttributes Hash representing user attributes
 * @return {?Boolean}                 true/false if the user attributes match/don't match the given conditions,
 *                                    null if the user attributes and conditions can't be evaluated
 */
function orEvaluator(conditions, userAttributes) {
  var sawNullResult = false;
  for (var i = 0; i < conditions.length; i++) {
    var conditionResult = evaluate(conditions[i], userAttributes);
    if (conditionResult === true) {
      return true;
    }
    if (conditionResult === null) {
      sawNullResult = true;
    }
  }
  return sawNullResult ? null : false;
}

/**
 * Evaluate the given exact match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @return  {?Boolean}  true if the user attribute value is equal (===) to the condition value,
 *                      false if the user attribute value is not equal (!==) to the condition value,
 *                      null if the condition value or user attribute value has an invalid type, or
 *                      if there is a mismatch between the user attribute type and the condition value
 *                      type
 */
function exactEvaluator(condition, userAttributes) {
  var conditionValue = condition.value;
  var conditionValueType = typeof conditionValue;
  var userValue = userAttributes[condition.name];
  var userValueType = typeof userValue;

  if (EXACT_MATCH_ALLOWED_TYPES.indexOf(userValueType) === -1 ||
    EXACT_MATCH_ALLOWED_TYPES.indexOf(conditionValueType) === -1 ||
    conditionValueType !== userValueType) {
    return null;
  }

  return conditionValue === userValue;
}

/**
 * Evaluate the given exists match condition for the given user attributes
 * @param   {Object}  condition
 * @param   {Object}  userAttributes
 * @returns {Boolean} true if both:
 *                      1) the user attributes have a value for the given condition, and
 *                      2) the user attribute value is neither null nor undefined
 *                    Returns false otherwise
 */
function existsEvaluator(condition, userAttributes) {
  var userValue = userAttributes[condition.name];
  return typeof userValue !== 'undefined' && userValue !== null;
}

/**
 * Returns true if the value is invalid for numeric (greater than or less than) conditions.
 * @param value
 * @returns {boolean} true if the value is not NaN and is a number, false otherwise
 */
function valueIsInvalidForNumericConditions(value) {
  return typeof value !== 'number' || isNaN(value);
}

/**
 * Evaluate the given greater than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @returns {?Boolean}  true if the user attribute value is greater than the condition value,
 *                      false if the user attribute value is less than or equal to the condition value,
 *                      null if the condition value isn't a number or the user attribute value
 *                      isn't a number
 */
function greaterThanEvaluator(condition, userAttributes) {
  var userValue = userAttributes[condition.name];
  var conditionValue = condition.value;

  if (valueIsInvalidForNumericConditions(userValue) ||
    valueIsInvalidForNumericConditions(conditionValue)) {
    return null;
  }

  return userValue > conditionValue;
}

/**
 * Evaluate the given less than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @returns {?Boolean}  true if the user attribute value is less than the condition value,
 *                      null if the condition value isn't a number or the user attribute value
 *                      isn't a number
 */
function lessThanEvaluator(condition, userAttributes) {
  var userValue = userAttributes[condition.name];
  var conditionValue = condition.value;

  if (valueIsInvalidForNumericConditions(userValue) ||
    valueIsInvalidForNumericConditions(conditionValue)) {
    return null;
  }

  return userValue < conditionValue;
}

/**
 * Evaluate the given substring match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @returns {?Boolean}  true if the condition value is a substring of the user attribute value,
 *                      null if the condition value isn't a string or the user attribute value
 *                      isn't a string
 */
function substringEvaluator(condition, userAttributes) {
  var userValue = userAttributes[condition.name];
  var conditionValue = condition.value;

  if (typeof userValue !== 'string' || typeof conditionValue !== 'string') {
    return null;
  }

  return userValue.indexOf(conditionValue) !== -1;
}

module.exports = {
  evaluate: evaluate,
};
