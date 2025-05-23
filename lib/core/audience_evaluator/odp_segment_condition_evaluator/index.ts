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
import { UNKNOWN_MATCH_TYPE } from 'error_message';
import { LoggerFacade } from '../../../logging/logger';
import { Condition, OptimizelyUserContext } from '../../../shared_types';

const QUALIFIED_MATCH_TYPE = 'qualified';

const MATCH_TYPES = [
  QUALIFIED_MATCH_TYPE,
];

type ConditionEvaluator = (condition: Condition, user: OptimizelyUserContext) => boolean | null;
type Evaluator = { evaluate: (condition: Condition, user: OptimizelyUserContext) => boolean | null; }

const EVALUATORS_BY_MATCH_TYPE: { [conditionType: string]: ConditionEvaluator | undefined } = {};
EVALUATORS_BY_MATCH_TYPE[QUALIFIED_MATCH_TYPE] = qualifiedEvaluator;

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
 * @param  {Condition}        condition
 * @param  {OptimizelyUserContext} user
 * @return {?boolean}         true/false if the given user attributes match/don't match the given condition,
 *                            null if the given user attributes and condition can't be evaluated
 * TODO: Change to accept and object with named properties
 */
function evaluate(condition: Condition, user: OptimizelyUserContext, logger?: LoggerFacade): boolean | null {
  const conditionMatch = condition.match;
  if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
    logger?.warn(UNKNOWN_MATCH_TYPE, JSON.stringify(condition));
    return null;
  }

  let evaluator;
  if (!conditionMatch) {
    evaluator = qualifiedEvaluator;
  } else {
    evaluator = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || qualifiedEvaluator;
  }

  return evaluator(condition, user);
}

function qualifiedEvaluator(condition: Condition, user: OptimizelyUserContext): boolean {
  return user.isQualifiedFor(condition.value as string);
}
