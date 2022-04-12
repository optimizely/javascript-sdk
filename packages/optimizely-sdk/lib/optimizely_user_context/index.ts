/****************************************************************************
 * Copyright 2020-2022, Optimizely, Inc. and contributors                   *
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
import Optimizely from '../../lib/optimizely';
import {
  EventTags,
  OptimizelyDecideOption,
  OptimizelyDecision,
  OptimizelyDecisionContext,
  OptimizelyForcedDecision,
  UserAttributes,
} from '../../lib/shared_types';
import { CONTROL_ATTRIBUTES } from '../utils/enums';

export default class OptimizelyUserContext {
  private optimizely: Optimizely;
  private userId: string;
  private attributes: UserAttributes;
  private forcedDecisionsMap: { [key: string]: { [key: string]: OptimizelyForcedDecision } };

  constructor({
    optimizely,
    userId,
    attributes,
  }: {
    optimizely: Optimizely,
    userId: string,
    attributes?: UserAttributes,
  }) {
    this.optimizely = optimizely;
    this.userId = userId;
    this.attributes = { ...attributes } ?? {};
    this.forcedDecisionsMap = {};
  }

  /**
   * Sets an attribute for a given key.
   * @param     {string}                     key         An attribute key
   * @param     {any}                        value       An attribute value
   */
  setAttribute(key: string, value: unknown): void {
    this.attributes[key] = value;
  }

  getUserId(): string {
    return this.userId;
  }

  getAttributes(): UserAttributes {
    return { ...this.attributes };
  }

  getOptimizely(): Optimizely {
    return this.optimizely;
  }

  /**
   * Returns a decision result for a given flag key and a user context, which contains all data required to deliver the flag.
   * If the SDK finds an error, it will return a decision with null for variationKey. The decision will include an error message in reasons.
   * @param     {string}                     key         A flag key for which a decision will be made.
   * @param     {OptimizelyDecideOption}     options     An array of options for decision-making.
   * @return    {OptimizelyDecision}                     A decision result.
   */
  decide(
    key: string,
    options: OptimizelyDecideOption[] = []
  ): OptimizelyDecision {

    return this.optimizely.decide(this.cloneUserContext(), key, options);
  }

  /**
   * Returns an object of decision results for multiple flag keys and a user context.
   * If the SDK finds an error for a key, the response will include a decision for the key showing reasons for the error.
   * The SDK will always return key-mapped decisions. When it cannot process requests, it will return an empty map after logging the errors.
   * @param     {string[]}                   keys        An array of flag keys for which decisions will be made.
   * @param     {OptimizelyDecideOption[]}   options     An array of options for decision-making.
   * @return    {[key: string]: OptimizelyDecision}      An object of decision results mapped by flag keys.
   */
  decideForKeys(
    keys: string[],
    options: OptimizelyDecideOption[] = [],
  ): { [key: string]: OptimizelyDecision } {

    return this.optimizely.decideForKeys(this.cloneUserContext(), keys, options);
  }

  /**
   * Returns an object of decision results for all active flag keys.
   * @param     {OptimizelyDecideOption[]}   options     An array of options for decision-making.
   * @return    {[key: string]: OptimizelyDecision}      An object of all decision results mapped by flag keys.
   */
  decideAll(
    options: OptimizelyDecideOption[] = []
  ): { [key: string]: OptimizelyDecision } {

    return this.optimizely.decideAll(this.cloneUserContext(), options);
  }

  /**
   * Tracks an event.
   * @param     {string}                     eventName The event name.
   * @param     {EventTags}                  eventTags An optional map of event tag names to event tag values.
   */
  trackEvent(eventName: string, eventTags?: EventTags): void {
    this.optimizely.track(eventName, this.userId, this.attributes, eventTags);
  }

  /**
   * Sets the forced decision for specified optimizely decision context.
   * @param     {OptimizelyDecisionContext}   context      OptimizelyDecisionContext containing flagKey and optional ruleKey.
   * @param     {OptimizelyForcedDecision}    decision     OptimizelyForcedDecision containing forced variation key.
   * @return    {boolean}                     true if the forced decision has been set successfully.
   */
  setForcedDecision(context: OptimizelyDecisionContext, decision: OptimizelyForcedDecision): boolean {
    const flagKey = context.flagKey;

    const ruleKey = context.ruleKey ?? CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY;
    const variationKey  = decision.variationKey;
    const forcedDecision = { variationKey };

    if (!this.forcedDecisionsMap[flagKey]) {
      this.forcedDecisionsMap[flagKey] = {};
    }
    this.forcedDecisionsMap[flagKey][ruleKey] = forcedDecision;

    return true;
  }

  /**
   * Returns the forced decision for specified optimizely decision context.
   * @param     {OptimizelyDecisionContext}  context  OptimizelyDecisionContext containing flagKey and optional ruleKey.
   * @return    {OptimizelyForcedDecision|null}       OptimizelyForcedDecision for specified context if exists or null.
   */
  getForcedDecision(context: OptimizelyDecisionContext): OptimizelyForcedDecision | null {
    return this.findForcedDecision(context);
  }

  /**
   * Removes the forced decision for specified optimizely decision context.
   * @param     {OptimizelyDecisionContext}  context  OptimizelyDecisionContext containing flagKey and optional ruleKey.
   * @return    {boolean}                    true if the forced decision has been removed successfully
   */
  removeForcedDecision(context: OptimizelyDecisionContext): boolean {
    const ruleKey = context.ruleKey ?? CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY;
    const flagKey = context.flagKey;

    let isForcedDecisionRemoved = false;

    if (this.forcedDecisionsMap.hasOwnProperty(flagKey)) {
      const forcedDecisionByRuleKey = this.forcedDecisionsMap[flagKey];
      if (forcedDecisionByRuleKey.hasOwnProperty(ruleKey)) {
        delete this.forcedDecisionsMap[flagKey][ruleKey];
        isForcedDecisionRemoved = true;
      }
      if (Object.keys(this.forcedDecisionsMap[flagKey]).length === 0) {
        delete this.forcedDecisionsMap[flagKey];
      }
    }

    return isForcedDecisionRemoved;
  }

  /**
   * Removes all forced decisions bound to this user context.
   * @return    {boolean}                    true if the forced decision has been removed successfully
   */
  removeAllForcedDecisions(): boolean {
    this.forcedDecisionsMap = {};
    return true;
  }

  /**
   * Finds a forced decision in forcedDecisionsMap for provided optimizely decision context.
   * @param     {OptimizelyDecisionContext}     context  OptimizelyDecisionContext containing flagKey and optional ruleKey.
   * @return    {OptimizelyForcedDecision|null}          OptimizelyForcedDecision for specified context if exists or null.
   */
  private findForcedDecision(context: OptimizelyDecisionContext): OptimizelyForcedDecision | null {
    let variationKey;
    const validRuleKey = context.ruleKey ?? CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY;
    const flagKey = context.flagKey;

    if (this.forcedDecisionsMap.hasOwnProperty(context.flagKey)) {
      const forcedDecisionByRuleKey = this.forcedDecisionsMap[flagKey];
      if (forcedDecisionByRuleKey.hasOwnProperty(validRuleKey)) {
        variationKey = forcedDecisionByRuleKey[validRuleKey].variationKey;
        return { variationKey };
      }
    }

    return null;
  }

  private cloneUserContext(): OptimizelyUserContext {
    const userContext = new OptimizelyUserContext({
      optimizely: this.getOptimizely(),
      userId: this.getUserId(),
      attributes: this.getAttributes(),
    });

    if (Object.keys(this.forcedDecisionsMap).length > 0) {
      userContext.forcedDecisionsMap = { ...this.forcedDecisionsMap };
    }

    return userContext;
  }
}
