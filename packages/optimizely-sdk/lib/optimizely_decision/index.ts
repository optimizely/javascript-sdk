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
  enabled: boolean;
  variables: { [variableKey: string]: unknown };
  ruleKey: string | null;
  flagKey: string;
  userContext: OptimizelyUserContext;
  reasons: string[];
}

export interface DecisionResponse<T> {
  result: T;
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
