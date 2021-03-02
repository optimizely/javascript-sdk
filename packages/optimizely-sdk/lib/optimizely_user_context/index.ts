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
import Optimizely from '../../lib/optimizely';
import {
  UserAttributes,
  OptimizelyDecideOption,
  OptimizelyDecision,
  EventTags
} from '../../lib/shared_types';

export default class OptimizelyUserContext {
  private optimizely: Optimizely;
  private userId: string;
  private attributes: UserAttributes;

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
    this.attributes = {...attributes} ?? {};
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
    return {...this.attributes};
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

  private cloneUserContext(): OptimizelyUserContext {
    return new OptimizelyUserContext({
      optimizely: this.getOptimizely(),
      userId: this.getUserId(),
      attributes: this.getAttributes(),
    })
  }
}
