/****************************************************************************
 * Copyright 2020, Optimizely, Inc. and contributors                   *
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
import OptimizelyUserContext from '../optimizely_user_context';

export interface OptimizelyDecision {
  variationKey: string | null;
  // The boolean value indicating if the flag is enabled or not
  enabled: boolean;
  // The collection of variables associated with the decision
  variables: { [variableKey: string]: unknown };
  // The rule key of the decision
  ruleKey: string | null;
  // The flag key for which the decision has been made for
  flagKey: string;
  // A copy of the user context for which the decision has been made for
  userContext: OptimizelyUserContext;
  // An array of error/info messages describing why the decision has been made.
  reasons: string[];
}

export function newErrorDecision(key: string, user: OptimizelyUserContext, reasons: string[]): OptimizelyDecision {
  return {
    variationKey: null,
    enabled: false,
    variables: {},
    ruleKey: null,
    flagKey: key,
    userContext: user,
    reasons: reasons,
  };
}
