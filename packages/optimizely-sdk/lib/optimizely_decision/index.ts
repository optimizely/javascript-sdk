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

export default class OptimizelyDecision {
  private variationKey?: string | null;
  private enabled: boolean;
  private variables: { [variableKey: string]: unknown } | null;
  private ruleKey?: string | null;
  private flagKey: string;
  private userContext: OptimizelyUserContext;
  private reasons: string[];

  constructor({
    variationKey,
    enabled,
    variables,
    ruleKey,
    flagKey,
    userContext,
    reasons,
  }: {
    variationKey?: string;
    enabled: boolean;
    variables: { [variableKey: string]: unknown } | null;
    ruleKey?: string;
    flagKey: string;
    userContext: OptimizelyUserContext;
    reasons: string[];
  }) {
    this.variationKey = variationKey;
    this.enabled = enabled;
    this.variables = variables;
    this.ruleKey = ruleKey;
    this.flagKey = flagKey;
    this.userContext = userContext;
    this.reasons = reasons;
  }

  static newErrorDecision(key: string, user: OptimizelyUserContext, reasons: string[]): OptimizelyDecision {
    return new OptimizelyDecision({
      variationKey: '',
      enabled: false,
      variables: null,
      ruleKey: '',
      flagKey: key,
      userContext: user,
      reasons: reasons,
    });
  }
}
