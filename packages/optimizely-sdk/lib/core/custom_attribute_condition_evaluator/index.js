/****************************************************************************
 * Copyright 2018-2019, 2020 Optimizely, Inc. and contributors              *
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
import { sprintf } from '@optimizely/js-sdk-utils';

import fns from '../../utils/fns';
import {
  LOG_LEVEL,
  LOG_MESSAGES,
} from '../../utils/enums';
import { compareVersion } from '../../utils/attributes_validator';

var MODULE_NAME = 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR';

var EXACT_MATCH_TYPE = 'exact';
var EXISTS_MATCH_TYPE = 'exists';
var GREATER_THAN_MATCH_TYPE = 'gt';
var GREATER_OR_EQUAL_THAN_MATCH_TYPE = 'ge';
var LESS_THAN_MATCH_TYPE = 'lt';
var LESS_OR_EQUAL_THAN_MATCH_TYPE = 'le';
var SUBSTRING_MATCH_TYPE = 'substring';
var SEMVER_EXACT_MATCH_TYPE = 'semver_eq';
var SEMVER_LESS_THAN_MATCH_TYPE = 'semver_lt';
var SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE = 'semver_le';
var SEMVER_GREATER_THAN_MATCH_TYPE = 'semver_gt';
var SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE = 'semver_ge';

var MATCH_TYPES = [
  EXACT_MATCH_TYPE,
  EXISTS_MATCH_TYPE,
  GREATER_THAN_MATCH_TYPE,
  GREATER_OR_EQUAL_THAN_MATCH_TYPE,
  LESS_THAN_MATCH_TYPE,
  LESS_OR_EQUAL_THAN_MATCH_TYPE,
  SUBSTRING_MATCH_TYPE,
  SEMVER_EXACT_MATCH_TYPE,
  SEMVER_LESS_THAN_MATCH_TYPE,
  SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE,
  SEMVER_GREATER_THAN_MATCH_TYPE,
  SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE
];

var EVALUATORS_BY_MATCH_TYPE = {};
EVALUATORS_BY_MATCH_TYPE[EXACT_MATCH_TYPE] = exactEvaluator;
EVALUATORS_BY_MATCH_TYPE[EXISTS_MATCH_TYPE] = existsEvaluator;
EVALUATORS_BY_MATCH_TYPE[GREATER_THAN_MATCH_TYPE] = greaterThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[GREATER_OR_EQUAL_THAN_MATCH_TYPE] = greaterOrEqualThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[LESS_THAN_MATCH_TYPE] = lessThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[LESS_OR_EQUAL_THAN_MATCH_TYPE] = lessOrEqualThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[SUBSTRING_MATCH_TYPE] = substringEvaluator;
EVALUATORS_BY_MATCH_TYPE[SEMVER_EXACT_MATCH_TYPE] = isSemanticVersionEqual;
EVALUATORS_BY_MATCH_TYPE[SEMVER_GREATER_THAN_MATCH_TYPE] = isSemanticVersionGreater;
EVALUATORS_BY_MATCH_TYPE[SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE] = isSemanticVersionGreaterOrEqual;
EVALUATORS_BY_MATCH_TYPE[SEMVER_LESS_THAN_MATCH_TYPE] = isSemanticVersionLess;
EVALUATORS_BY_MATCH_TYPE[SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE] = isSemanticVersionLessOrEqual;

/**
 * Given a custom attribute audience condition and user attributes, evaluate the
 * condition against the attributes.
 * @param  {Object}     condition
 * @param  {Object}     userAttributes
 * @param  {Object}     logger
 * @return {?Boolean}   true/false if the given user attributes match/don't match the given condition,
 *                                      null if the given user attributes and condition can't be evaluated
 * TODO: Change to accept and object with named properties
 */
export var evaluate = function(condition, userAttributes, logger) {
  var conditionMatch = condition.match;
  if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
    logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME, JSON.stringify(condition)));
    return null;
  }

  var attributeKey = condition.name;
  if (!userAttributes.hasOwnProperty(attributeKey) && conditionMatch != EXISTS_MATCH_TYPE) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.MISSING_ATTRIBUTE_VALUE, MODULE_NAME, JSON.stringify(condition), attributeKey)
    );
    return null;
  }

  var evaluatorForMatch = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || exactEvaluator;
  return evaluatorForMatch(condition, userAttributes, logger);
};

/**
 * Returns true if the value is valid for exact conditions. Valid values include
 * strings, booleans, and numbers that aren't NaN, -Infinity, or Infinity.
 * @param value
 * @returns {Boolean}
 */
function isValueTypeValidForExactConditions(value) {
  return typeof value === 'string' || typeof value === 'boolean' || fns.isNumber(value);
}

/**
 * Evaluate the given exact match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @return  {?Boolean}  true if the user attribute value is equal (===) to the condition value,
 *                      false if the user attribute value is not equal (!==) to the condition value,
 *                      null if the condition value or user attribute value has an invalid type, or
 *                      if there is a mismatch between the user attribute type and the condition value
 *                      type
 */
function exactEvaluator(condition, userAttributes, logger) {
  var conditionValue = condition.value;
  var conditionValueType = typeof conditionValue;
  var conditionName = condition.name;
  var userValue = userAttributes[conditionName];
  var userValueType = typeof userValue;

  if (
    !isValueTypeValidForExactConditions(conditionValue) ||
    (fns.isNumber(conditionValue) && !fns.isSafeInteger(conditionValue))
  ) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (!isValueTypeValidForExactConditions(userValue) || conditionValueType !== userValueType) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  if (fns.isNumber(userValue) && !fns.isSafeInteger(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
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
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute value is greater than the condition value,
 *                      false if the user attribute value is less than or equal to the condition value,
 *                      null if the condition value isn't a number or the user attribute value
 *                      isn't a number
 */
function greaterThanEvaluator(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[conditionName];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (!fns.isSafeInteger(conditionValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (!fns.isNumber(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  if (!fns.isSafeInteger(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  return userValue > conditionValue;
}

/**
 * Evaluate the given greater or equal than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute value is greater or equal than the condition value,
 *                      false if the user attribute value is less than to the condition value,
 *                      null if the condition value isn't a number or the user attribute value isn't a
 *                      number
 */
function greaterOrEqualThanEvaluator(condition, userAttributes, logger) {
  return greaterThanEvaluator(condition, userAttributes, logger) || exactEvaluator(condition, userAttributes, logger);
}

/**
 * Evaluate the given less than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute value is less than the condition value,
 *                      false if the user attribute value is greater than or equal to the condition value,
 *                      null if the condition value isn't a number or the user attribute value isn't a
 *                      number
 */
function lessThanEvaluator(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[condition.name];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (!fns.isSafeInteger(conditionValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (!fns.isNumber(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  if (!fns.isSafeInteger(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  return userValue < conditionValue;
}

/**
 * Evaluate the given less or equal than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute value is less or equal than the condition value,
 *                      false if the user attribute value is greater than to the condition value,
 *                      null if the condition value isn't a number or the user attribute value isn't a
 *                      number
 */
function lessOrEqualThanEvaluator(condition, userAttributes, logger) {
  return lessThanEvaluator(condition, userAttributes, logger) || exactEvaluator(condition, userAttributes, logger);
}

/**
 * Evaluate the given substring match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the condition value is a substring of the user attribute value,
 *                      false if the condition value is not a substring of the user attribute value,
 *                      null if the condition value isn't a string or the user attribute value
 *                      isn't a string
 */
function substringEvaluator(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[condition.name];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (typeof conditionValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (typeof userValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  return userValue.indexOf(conditionValue) !== -1;
}

/**
 * Evaluate the given version match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute version is equal (===) to the condition version,
 *                      false if the user attribute version is not equal (!==) to the condition version,
 *                      null if the user attribute version has an invalid type
 */
function isSemanticVersionEqual(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[conditionName];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (typeof conditionValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (typeof userValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  return compareVersion(userValue, conditionValue) === 0;
}

/**
 * Evaluate the given version greater than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute version is greater than the condition version,
 *                      false if the user attribute version is less than or equal to the condition version,
 *                      null if the user attribute version has an invalid type
 */
function isSemanticVersionGreater(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[conditionName];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (typeof conditionValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (typeof userValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  return compareVersion(userValue, conditionValue) > 0;
}

/**
 * Evaluate the given version greater or equal than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute version is greater or equal than the condition version,
 *                      false if the user attribute version is less than to the condition version,
 *                      null if the user attribute version has an invalid type
 */
function isSemanticVersionGreaterOrEqual(condition, userAttributes, logger) {
  return isSemanticVersionEqual(condition, userAttributes, logger) || isSemanticVersionGreater(condition, userAttributes, logger);
}

/**
 * Evaluate the given version less than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute version is less than the condition version,
 *                      false if the user attribute version is greater than or equal to the condition version,
 *                      null if the user attribute version has an invalid type
 */
function isSemanticVersionLess(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[conditionName];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (typeof conditionValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (typeof userValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  return compareVersion(userValue, conditionValue) < 0;
}

/**
 * Evaluate the given version less or equal than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute version is less or equal than the condition version,
 *                      false if the user attribute version is greater than to the condition version,
 *                      null if the user attribute version has an invalid type
 */
function isSemanticVersionLessOrEqual(condition, userAttributes, logger) {
  return isSemanticVersionLess(condition, userAttributes, logger) || isSemanticVersionEqual(condition, userAttributes, logger);
}

export default {
  evaluate: evaluate,
};
