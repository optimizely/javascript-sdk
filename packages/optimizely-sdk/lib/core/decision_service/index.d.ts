/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { LogHandler } from '@optimizely/js-sdk-logging';
import { ProjectConfig } from '../project_config';
import { UserAttributes, UserProfileService, Experiment, Variation } from '../../shared_types';
import { FeatureFlag } from '../project_config/entities';

/**
 * Creates an instance of the DecisionService.
 * @param  {Options}          options        Configuration options
 * @return {DecisionService}  An instance of the DecisionService
 */
export function createDecisionService(options: Options): DecisionService;

export interface DecisionService {

  /**
   * Gets variation where visitor will be bucketed.
   * @param   {ProjectConfig}  configObj      The parsed project configuration object
   * @param   {string}         experimentKey
   * @param   {string}         userId
   * @param   {UserAttributes} attributes
   * @return  {string|null}    The variation the user is bucketed into.
   */
  getVariation(
    configObj: ProjectConfig,
    experimentKey: string,
    userId: string,
    attributes?: UserAttributes
  ): string | null;

  /**
   * Given a feature, user ID, and attributes, returns an object representing a
   * decision. If the user was bucketed into a variation for the given feature
   * and attributes, the returned decision object will have variation and
   * experiment properties (both objects), as well as a decisionSource property.
   * decisionSource indicates whether the decision was due to a rollout or an
   * experiment.
   * @param   {ProjectConfig} configObj      The parsed project configuration object
   * @param   {FeatureFlag}   feature        A feature flag object from project configuration
   * @param   {string}        userId         A string identifying the user, for bucketing
   * @param   {unknown}       attributes     Optional user attributes
   * @return  {Decision}      An object with experiment, variation, and decisionSource
   * properties. If the user was not bucketed into a variation, the variation
   * property is null.
   */
  getVariationForFeature(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    userId: string,
    attributes: unknown
  ): Decision;

  /**
   * Removes forced variation for given userId and experimentKey
   * @param  {unknown}        userId         String representing the user id
   * @param  {string}         experimentId   Number representing the experiment id
   * @param  {string}         experimentKey  Key representing the experiment id
   * @throws If the user id is not valid or not in the forced variation map
   */
  removeForcedVariation(userId: unknown, experimentId: string, experimentKey: string): void;

  /**
   * Gets the forced variation key for the given user and experiment.
   * @param  {ProjectConfig}  configObj      Object representing project configuration
   * @param  {string}         experimentKey  Key for experiment.
   * @param  {string}         userId         The user Id.
   * @return {string|null}    Variation key that specifies the variation which the given user and experiment should be forced into.
   */
  getForcedVariation(configObj: ProjectConfig, experimentKey: string, userId: string): string | null;

  /**
   * Sets the forced variation for a user in a given experiment
   * @param  {ProjectConfig}  configObj      Object representing project configuration
   * @param  {string}         experimentKey  Key for experiment.
   * @param  {string}         userId         The user Id.
   * @param  {unknown}        variationKey   Key for variation. If null, then clear the existing experiment-to-variation mapping
   * @return {boolean}        A boolean value that indicates if the set completed successfully.
   */
  setForcedVariation(configObj: ProjectConfig, experimentKey: string, userId: string, variationKey: unknown): boolean;
}

interface Options {
  userProfileService: UserProfileService | null;
  logger: LogHandler;
  UNSTABLE_conditionEvaluators: unknown;
}

interface Decision {
  experiment: Experiment | null;
  variation: Variation | null;
  decisionSource: string;
}
