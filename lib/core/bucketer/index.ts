/**
 * Copyright 2016, 2019-2022, Optimizely
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

/**
 * Bucketer API for determining the variation id from the specified parameters
 */
import { LoggerFacade } from '../../logging/logger';
import {
  DecisionResponse,
  BucketerParams,
  TrafficAllocation,
  Group,
} from '../../shared_types';
import { INVALID_GROUP_ID } from 'error_message';
import { OptimizelyError } from '../../error/optimizly_error';
import { generateBucketValue } from './bucket_value_generator';
import { DecisionReason } from '../decision_service';
import { Platform } from '../../platform_support';

export const USER_NOT_IN_ANY_EXPERIMENT = 'User %s is not in any experiment of group %s.';
export const USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP = 'User %s is not in experiment %s of group %s.';
export const USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP = 'User %s is in experiment %s of group %s.';
export const USER_ASSIGNED_TO_EXPERIMENT_BUCKET = 'Assigned bucket %s to user with bucketing ID %s.';
export const INVALID_VARIATION_ID = 'Bucketed into an invalid variation ID. Returning null.';
const RANDOM_POLICY = 'random';

/**
 * Determines ID of variation to be shown for the given input params
 * @param  {Object}             bucketerParams
 * @param  {string}             bucketerParams.experimentId
 * @param  {string}             bucketerParams.experimentKey
 * @param  {string}             bucketerParams.userId
 * @param  {Object[]}           bucketerParams.trafficAllocationConfig
 * @param  {Array}              bucketerParams.experimentKeyMap
 * @param  {Object}             bucketerParams.groupIdMap
 * @param  {Object}             bucketerParams.variationIdMap
 * @param  {string}             bucketerParams.varationIdMap[].key
 * @param  {Object}             bucketerParams.logger
 * @param  {string}             bucketerParams.bucketingId
 * @return {Object}             DecisionResponse                         DecisionResponse containing variation ID that user has been bucketed into,
 *                                                                       null if user is not bucketed into any experiment and the decide reasons.
 */
export const bucket = function(bucketerParams: BucketerParams): DecisionResponse<string | null> {
  const decideReasons: DecisionReason[] = [];
  // Check if user is in a random group; if so, check if user is bucketed into a specific experiment
  const experiment = bucketerParams.experimentIdMap[bucketerParams.experimentId];
  // Optional chaining skips groupId check for holdout experiments; Holdout experimentId is not in experimentIdMap
  const groupId = experiment?.['groupId'];
  if (groupId) {
    const group = bucketerParams.groupIdMap[groupId];
    if (!group) {
      throw new OptimizelyError(INVALID_GROUP_ID, groupId);
    }
    if (group.policy === RANDOM_POLICY) {
      const bucketedExperimentId = bucketUserIntoExperiment(
        group,
        bucketerParams.bucketingId,
        bucketerParams.userId,
        bucketerParams.logger
      );

      // Return if user is not bucketed into any experiment
      if (bucketedExperimentId === null) {
        bucketerParams.logger?.info(
          USER_NOT_IN_ANY_EXPERIMENT,
          bucketerParams.userId,
          groupId,
        );
        decideReasons.push([
          USER_NOT_IN_ANY_EXPERIMENT,
          bucketerParams.userId,
          groupId,
        ]);
        return {
          result: null,
          reasons: decideReasons,
        };
      }

      // Return if user is bucketed into a different experiment than the one specified
      if (bucketedExperimentId !== bucketerParams.experimentId) {        
        bucketerParams.logger?.info(
          USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
          bucketerParams.userId,
          bucketerParams.experimentKey,
          groupId,
        );
        decideReasons.push([
          USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
          bucketerParams.userId,
          bucketerParams.experimentKey,
          groupId,
        ]);
        return {
          result: null,
          reasons: decideReasons,
        };
      }

      // Continue bucketing if user is bucketed into specified experiment      
      bucketerParams.logger?.info(
        USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
        bucketerParams.userId,
        bucketerParams.experimentKey,
        groupId,
      );
      decideReasons.push([
        USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
        bucketerParams.userId,
        bucketerParams.experimentKey,
        groupId,
      ]);
    }
  }
  const bucketingId = `${bucketerParams.bucketingId}${bucketerParams.experimentId}`;
  const bucketValue = generateBucketValue(bucketingId);
  
  bucketerParams.logger?.debug(
    USER_ASSIGNED_TO_EXPERIMENT_BUCKET,
    bucketValue,
    bucketerParams.userId,
  );
  decideReasons.push([
    USER_ASSIGNED_TO_EXPERIMENT_BUCKET,
    bucketValue,
    bucketerParams.userId,
  ]);

  const entityId = _findBucket(bucketValue, bucketerParams.trafficAllocationConfig);
  
  if (bucketerParams.validateEntity && entityId !== null && !bucketerParams.variationIdMap[entityId]) {
    if (entityId) {        
      bucketerParams.logger?.warn(INVALID_VARIATION_ID);
      decideReasons.push([INVALID_VARIATION_ID]);
    }
    return {
      result: null,
      reasons: decideReasons,
    };
  }

  return {
    result: entityId,
    reasons: decideReasons,
  };
};

/**
 * Returns bucketed experiment ID to compare against experiment user is being called into
 * @param  {Group}       group        Group that experiment is in
 * @param  {string}      bucketingId  Bucketing ID
 * @param  {string}      userId       ID of user to be bucketed into experiment
 * @param  {LoggerFacade}  logger       Logger implementation
 * @return {string|null}              ID of experiment if user is bucketed into experiment within the group, null otherwise
 */
export const bucketUserIntoExperiment = function(
  group: Group,
  bucketingId: string,
  userId: string,
  logger?: LoggerFacade
): string | null {
  const bucketingKey = `${bucketingId}${group.id}`;
  const bucketValue = generateBucketValue(bucketingKey);
  logger?.debug(
    USER_ASSIGNED_TO_EXPERIMENT_BUCKET,
    bucketValue,
    userId,
  );
  const trafficAllocationConfig = group.trafficAllocation;
  const bucketedExperimentId = _findBucket(bucketValue, trafficAllocationConfig);
  return bucketedExperimentId;
};

/**
 * Returns entity ID associated with bucket value
 * @param  {number}                bucketValue
 * @param  {TrafficAllocation[]}   trafficAllocationConfig
 * @param  {number}                trafficAllocationConfig[].endOfRange
 * @param  {string}                trafficAllocationConfig[].entityId
 * @return {string|null}           Entity ID for bucketing if bucket value is within traffic allocation boundaries, null otherwise
 */
export const _findBucket = function(
  bucketValue: number,
  trafficAllocationConfig: TrafficAllocation[]
): string | null {
  for (let i = 0; i < trafficAllocationConfig.length; i++) {
    if (bucketValue < trafficAllocationConfig[i].endOfRange) {
      return trafficAllocationConfig[i].entityId;
    }
  }

  return null;
};

export default {
  bucket: bucket,
  bucketUserIntoExperiment: bucketUserIntoExperiment,
};

export const __platforms: Platform[] = ['__universal__'];
