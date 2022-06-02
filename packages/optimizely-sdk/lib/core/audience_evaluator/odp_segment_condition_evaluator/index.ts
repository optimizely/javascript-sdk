/****************************************************************************
 * Copyright 2022 Optimizely, Inc. and contributors              *
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
import { getLogger } from '@optimizely/js-sdk-logging';
import { Condition, UserAttributes } from '../../../shared_types';

import { LOG_MESSAGES } from '../../../utils/enums';

const MODULE_NAME = 'ODP_SEGMENT_CONDITION_EVALUATOR';

const logger = getLogger();

const QUALIFIED_MATCH_TYPE = 'qualified';

const MATCH_TYPES = [
  QUALIFIED_MATCH_TYPE,
];

type ConditionEvaluator = (condition: Condition, userAttributes: UserAttributes, segments: string[]) => boolean | null;

const EVALUATORS_BY_MATCH_TYPE: { [conditionType: string]: ConditionEvaluator | undefined } = {};
EVALUATORS_BY_MATCH_TYPE[QUALIFIED_MATCH_TYPE] = qualifiedEvaluator;

/**
 * Given a custom attribute audience condition and user attributes, evaluate the
 * condition against the attributes.
 * @param  {Condition}        condition
 * @param  {UserAttributes}   userAttributes
 * @param  {LoggerFacade}     logger
 * @return {?boolean}         true/false if the given user attributes match/don't match the given condition,
 *                            null if the given user attributes and condition can't be evaluated
 * TODO: Change to accept and object with named properties
 */
export function evaluate(condition: Condition, userAttributes: UserAttributes, segments: string[]): boolean | null {
  const conditionMatch = condition.match;
  if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
    logger.warn(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME, JSON.stringify(condition));
    return null;
  }

  let evaluator;
  if (!conditionMatch) {
    evaluator = qualifiedEvaluator;
  } else {
    evaluator = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || qualifiedEvaluator;
  }

  return evaluator(condition, userAttributes, segments);
}

function qualifiedEvaluator(condition: Condition, userAttributes: UserAttributes, segments: string[]): boolean {
  return segments.indexOf(condition.value as string) > -1;
}
