/****************************************************************************
 * Copyright 2018, Optimizely, Inc. and contributors                        *
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

var fns = require('../../utils/fns');

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

/**
 * Given a custom attribute audience condition and user attributes, evaluate the
 * condition against the attributes.
 * @param {Object}    condition
 * @param {Object}    userAttributes
 * @return {?Boolean} true/false if the given user attributes match/don't match the given condition, null if
 *                    the given user attributes and condition can't be evaluated
 */
function evaluate(condition, userAttributes) {
  if (condition.type !== CUSTOM_ATTRIBUTE_CONDITION_TYPE) {
    return null;
  }

  var conditionMatch = condition.match;
  if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
    return null;
  }

  var evaluatorForMatch = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || exactEvaluator;
  return evaluatorForMatch(condition, userAttributes);
}

/**
 * Returns true if the value is valid for exact conditions. Valid values include
 * strings, booleans, and numbers that aren't NaN, -Infinity, or Infinity.
 * @param value
 * @returns {Boolean}
 */
function isValueValidForExactConditions(value) {
  return typeof value === 'string' || typeof value === 'boolean' ||
    fns.isFinite(value);
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

  if (!isValueValidForExactConditions(userValue) ||
    !isValueValidForExactConditions(conditionValue) ||
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

  if (!fns.isFinite(userValue) || !fns.isFinite(conditionValue)) {
    return null;
  }

  return userValue > conditionValue;
}

/**
 * Evaluate the given less than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @returns {?Boolean}  true if the user attribute value is less than the condition value,
 *                      false if the user attribute value is greater than or equal to the condition value,
 *                      null if the condition value isn't a number or the user attribute value isn't a
 *                      number
 */
function lessThanEvaluator(condition, userAttributes) {
  var userValue = userAttributes[condition.name];
  var conditionValue = condition.value;

  if (!fns.isFinite(userValue) || !fns.isFinite(conditionValue)) {
    return null;
  }

  return userValue < conditionValue;
}

/**
 * Evaluate the given substring match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @returns {?Boolean}  true if the condition value is a substring of the user attribute value,
 *                      false if the condition value is not a substring of the user attribute value,
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
  evaluate: evaluate
};
