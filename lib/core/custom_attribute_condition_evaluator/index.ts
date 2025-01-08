/****************************************************************************
 * Copyright 2018-2019, 2020, 2022, Optimizely, Inc. and contributors              *
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
import { Condition, OptimizelyUserContext } from '../../shared_types';

import fns from '../../utils/fns';
import { compareVersion } from '../../utils/semantic_version';
import {
  MISSING_ATTRIBUTE_VALUE,
  UNEXPECTED_TYPE_NULL,
} from '../../log_messages';
import {
  OUT_OF_BOUNDS,
  UNEXPECTED_TYPE,
  UNEXPECTED_CONDITION_VALUE,
  UNKNOWN_MATCH_TYPE
} from '../../error_messages';
import { LoggerFacade } from '../../logging/logger';

const MODULE_NAME = 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR';

const EXACT_MATCH_TYPE = 'exact';
const EXISTS_MATCH_TYPE = 'exists';
const GREATER_OR_EQUAL_THAN_MATCH_TYPE = 'ge';
const GREATER_THAN_MATCH_TYPE = 'gt';
const LESS_OR_EQUAL_THAN_MATCH_TYPE = 'le';
const LESS_THAN_MATCH_TYPE = 'lt';
const SEMVER_EXACT_MATCH_TYPE = 'semver_eq';
const SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE = 'semver_ge';
const SEMVER_GREATER_THAN_MATCH_TYPE = 'semver_gt';
const SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE = 'semver_le';
const SEMVER_LESS_THAN_MATCH_TYPE = 'semver_lt';
const SUBSTRING_MATCH_TYPE = 'substring';

const MATCH_TYPES = [
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

type ConditionEvaluator = (condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade) => boolean | null;
type Evaluator = { evaluate: (condition: Condition, user: OptimizelyUserContext) => boolean | null; }

const EVALUATORS_BY_MATCH_TYPE: { [conditionType: string]: ConditionEvaluator | undefined } = {};
EVALUATORS_BY_MATCH_TYPE[EXACT_MATCH_TYPE] = exactEvaluator;
EVALUATORS_BY_MATCH_TYPE[EXISTS_MATCH_TYPE] = existsEvaluator;
EVALUATORS_BY_MATCH_TYPE[GREATER_THAN_MATCH_TYPE] = greaterThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[GREATER_OR_EQUAL_THAN_MATCH_TYPE] = greaterThanOrEqualEvaluator;
EVALUATORS_BY_MATCH_TYPE[LESS_THAN_MATCH_TYPE] = lessThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[LESS_OR_EQUAL_THAN_MATCH_TYPE] = lessThanOrEqualEvaluator;
EVALUATORS_BY_MATCH_TYPE[SUBSTRING_MATCH_TYPE] = substringEvaluator;
EVALUATORS_BY_MATCH_TYPE[SEMVER_EXACT_MATCH_TYPE] = semverEqualEvaluator;
EVALUATORS_BY_MATCH_TYPE[SEMVER_GREATER_THAN_MATCH_TYPE] = semverGreaterThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[SEMVER_GREATER_OR_EQUAL_THAN_MATCH_TYPE] = semverGreaterThanOrEqualEvaluator;
EVALUATORS_BY_MATCH_TYPE[SEMVER_LESS_THAN_MATCH_TYPE] = semverLessThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[SEMVER_LESS_OR_EQUAL_THAN_MATCH_TYPE] = semverLessThanOrEqualEvaluator;

export const getEvaluator = (logger?: LoggerFacade): Evaluator => {
  return {
    evaluate(condition: Condition, user: OptimizelyUserContext): boolean | null {
      return evaluate(condition, user, logger);
    }
  };
}

/**
 * Given a custom attribute audience condition and user attributes, evaluate the
 * condition against the attributes.
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @return {?boolean}               true/false if the given user attributes match/don't match the given condition,
 *                                  null if the given user attributes and condition can't be evaluated
 * TODO: Change to accept and object with named properties
 */
function evaluate(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const userAttributes = user.getAttributes();
  const conditionMatch = condition.match;
  if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
    logger?.warn(UNKNOWN_MATCH_TYPE, JSON.stringify(condition));
    return null;
  }

  const attributeKey = condition.name;
  if (!userAttributes.hasOwnProperty(attributeKey) && conditionMatch != EXISTS_MATCH_TYPE) {
    logger?.debug(
      MISSING_ATTRIBUTE_VALUE, JSON.stringify(condition), attributeKey
    );
    return null;
  }

  let evaluatorForMatch;
  if (!conditionMatch) {
    evaluatorForMatch = exactEvaluator;
  } else {
    evaluatorForMatch = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || exactEvaluator;
  }

  return evaluatorForMatch(condition, user, logger);
}

/**
 * Returns true if the value is valid for exact conditions. Valid values include
 * strings, booleans, and numbers that aren't NaN, -Infinity, or Infinity.
 * @param value
 * @returns {boolean}
 */
function isValueTypeValidForExactConditions(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'boolean' || fns.isNumber(value);
}

/**
 * Evaluate the given exact match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @return  {?boolean}              true if the user attribute value is equal (===) to the condition value,
 *                                  false if the user attribute value is not equal (!==) to the condition value,
 *                                  null if the condition value or user attribute value has an invalid type, or
 *                                  if there is a mismatch between the user attribute type and the condition value
 *                                  type
 */
function exactEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const userAttributes = user.getAttributes();
  const conditionValue = condition.value;
  const conditionValueType = typeof conditionValue;
  const conditionName = condition.name;
  const userValue = userAttributes[conditionName];
  const userValueType = typeof userValue;

  if (
    !isValueTypeValidForExactConditions(conditionValue) ||
    (fns.isNumber(conditionValue) && !fns.isSafeInteger(conditionValue))
  ) {
    logger?.warn(
      UNEXPECTED_CONDITION_VALUE, JSON.stringify(condition)
    );
    return null;
  }

  if (userValue === null) {
    logger?.debug(
      UNEXPECTED_TYPE_NULL, JSON.stringify(condition), conditionName
    );
    return null;
  }

  if (!isValueTypeValidForExactConditions(userValue) || conditionValueType !== userValueType) {
    logger?.warn(
      UNEXPECTED_TYPE, JSON.stringify(condition), userValueType, conditionName
    );
    return null;
  }

  if (fns.isNumber(userValue) && !fns.isSafeInteger(userValue)) {
    logger?.warn(
      OUT_OF_BOUNDS, JSON.stringify(condition), conditionName
    );
    return null;
  }

  return conditionValue === userValue;
}

/**
 * Evaluate the given exists match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {boolean}               true if both:
 *                                    1) the user attributes have a value for the given condition, and
 *                                    2) the user attribute value is neither null nor undefined
 *                                  Returns false otherwise
 */
function existsEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean {
  const userAttributes = user.getAttributes();
  const userValue = userAttributes[condition.name];
  return typeof userValue !== 'undefined' && userValue !== null;
}

/**
 * Validate user and condition values
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?boolean}              true if values are valid,
 *                                  false if values are not valid
 */
function validateValuesForNumericCondition(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean {
  const userAttributes = user.getAttributes();
  const conditionName = condition.name;
  const userValue = userAttributes[conditionName];
  const userValueType = typeof userValue;
  const conditionValue = condition.value;

  if (conditionValue === null || !fns.isSafeInteger(conditionValue)) {
    logger?.warn(
      UNEXPECTED_CONDITION_VALUE, JSON.stringify(condition)
    );
    return false;
  }

  if (userValue === null) {
    logger?.debug(
      UNEXPECTED_TYPE_NULL, JSON.stringify(condition), conditionName
    );
    return false;
  }

  if (!fns.isNumber(userValue)) {
    logger?.warn(
      UNEXPECTED_TYPE, JSON.stringify(condition), userValueType, conditionName
    );
    return false;
  }

  if (!fns.isSafeInteger(userValue)) {
    logger?.warn(
      OUT_OF_BOUNDS, JSON.stringify(condition), conditionName
    );
    return false;
  }
  return true;
}

/**
 * Evaluate the given greater than match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?boolean}              true if the user attribute value is greater than the condition value,
 *                                  false if the user attribute value is less than or equal to the condition value,
 *                                  null if the condition value isn't a number or the user attribute value
 *                                  isn't a number
 */
function greaterThanEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const userAttributes = user.getAttributes();
  const userValue = userAttributes[condition.name];
  const conditionValue = condition.value;

  if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
    return null;
  }
  return userValue! > conditionValue;
}

/**
 * Evaluate the given greater or equal than match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the user attribute value is greater or equal than the condition value,
 *                                  false if the user attribute value is less than to the condition value,
 *                                  null if the condition value isn't a number or the user attribute value isn't a
 *                                  number
 */
function greaterThanOrEqualEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const userAttributes = user.getAttributes();
  const userValue = userAttributes[condition.name];
  const conditionValue = condition.value;

  if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
    return null;
  }

  return userValue! >= conditionValue;
}

/**
 * Evaluate the given less than match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?boolean}              true if the user attribute value is less than the condition value,
 *                                  false if the user attribute value is greater than or equal to the condition value,
 *                                  null if the condition value isn't a number or the user attribute value isn't a
 *                                  number
 */
function lessThanEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const userAttributes = user.getAttributes();
  const userValue = userAttributes[condition.name];
  const conditionValue = condition.value;

  if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
    return null;
  }

  return userValue! < conditionValue;
}

/**
 * Evaluate the given less or equal than match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the user attribute value is less or equal than the condition value,
 *                                  false if the user attribute value is greater than to the condition value,
 *                                  null if the condition value isn't a number or the user attribute value isn't a
 *                                  number
 */
function lessThanOrEqualEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const userAttributes = user.getAttributes();
  const userValue = userAttributes[condition.name];
  const conditionValue = condition.value;

  if (!validateValuesForNumericCondition(condition, user) || conditionValue === null) {
    return null;
  }

  return userValue! <= conditionValue;
}

/**
 * Evaluate the given substring match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the condition value is a substring of the user attribute value,
 *                                  false if the condition value is not a substring of the user attribute value,
 *                                  null if the condition value isn't a string or the user attribute value
 *                                  isn't a string
 */
function substringEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const userAttributes = user.getAttributes();
  const conditionName = condition.name;
  const userValue = userAttributes[condition.name];
  const userValueType = typeof userValue;
  const conditionValue = condition.value;

  if (typeof conditionValue !== 'string') {
    logger?.warn(
      UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition)
    );
    return null;
  }

  if (userValue === null) {
    logger?.debug(
      UNEXPECTED_TYPE_NULL, JSON.stringify(condition), conditionName
    );
    return null;
  }

  if (typeof userValue !== 'string') {
    logger?.warn(
      UNEXPECTED_TYPE, JSON.stringify(condition), userValueType, conditionName
    );
    return null;
  }

  return userValue.indexOf(conditionValue) !== -1;
}

/**
 * Evaluate the given semantic version match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?number}               returns compareVersion result
 *                                  null if the user attribute version has an invalid type
 */
function evaluateSemanticVersion(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): number | null {
  const userAttributes = user.getAttributes();
  const conditionName = condition.name;
  const userValue = userAttributes[conditionName];
  const userValueType = typeof userValue;
  const conditionValue = condition.value;

  if (typeof conditionValue !== 'string') {
    logger?.warn(
      UNEXPECTED_CONDITION_VALUE, JSON.stringify(condition)
    );
    return null;
  }

  if (userValue === null) {
    logger?.debug(
      UNEXPECTED_TYPE_NULL, JSON.stringify(condition), conditionName
    );
    return null;
  }

  if (typeof userValue !== 'string') {
    logger?.warn(
      UNEXPECTED_TYPE, JSON.stringify(condition), userValueType, conditionName
    );
    return null;
  }

  return compareVersion(conditionValue, userValue, logger);
}

/**
 * Evaluate the given version match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the user attribute version is equal (===) to the condition version,
 *                                  false if the user attribute version is not equal (!==) to the condition version,
 *                                  null if the user attribute version has an invalid type
 */
function semverEqualEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const result = evaluateSemanticVersion(condition, user, logger);
  if (result === null) {
    return null;
  }
  return result === 0;
}

/**
 * Evaluate the given version match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the user attribute version is greater (>) than the condition version,
 *                                  false if the user attribute version is not greater than the condition version,
 *                                  null if the user attribute version has an invalid type
 */
function semverGreaterThanEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const result = evaluateSemanticVersion(condition, user, logger);
  if (result === null) {
    return null;
  }
  return result > 0;
}

/**
 * Evaluate the given version match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the user attribute version is less (<) than the condition version,
 *                                  false if the user attribute version is not less than the condition version,
 *                                  null if the user attribute version has an invalid type
 */
function semverLessThanEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const result = evaluateSemanticVersion(condition, user, logger);
  if (result === null) {
    return null;
  }
  return result < 0;
}

/**
 * Evaluate the given version match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the user attribute version is greater than or equal (>=) to the condition version,
 *                                  false if the user attribute version is not greater than or equal to the condition version,
 *                                  null if the user attribute version has an invalid type
 */
function semverGreaterThanOrEqualEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const result = evaluateSemanticVersion(condition, user, logger);
  if (result === null) {
    return null;
  }
  return result >= 0;
}

/**
 * Evaluate the given version match condition for the given user attributes
 * @param  {Condition}              condition
 * @param  {OptimizelyUserContext}  user
 * @returns {?Boolean}              true if the user attribute version is less than or equal (<=) to the condition version,
 *                                  false if the user attribute version is not less than or equal to the condition version,
 *                                  null if the user attribute version has an invalid type
 */
function semverLessThanOrEqualEvaluator(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const result = evaluateSemanticVersion(condition, user, logger);
  if (result === null) {
    return null;
  }
  return result <= 0;
}
