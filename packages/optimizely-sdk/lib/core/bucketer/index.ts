/**
 * Copyright 2016, 2019-2021, Optimizely
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
import { sprintf } from '@optimizely/js-sdk-utils';
import murmurhash from 'murmurhash';
import { LogHandler } from '@optimizely/js-sdk-logging';
import {
  DecisionResponse,
  BucketerParams,
  TrafficAllocation,
  Group,
} from '../../shared_types';

import {
  ERROR_MESSAGES,
  LOG_LEVEL,
  LOG_MESSAGES,
} from '../../utils/enums';

const HASH_SEED = 1;
const MAX_HASH_VALUE = Math.pow(2, 32);
const MAX_TRAFFIC_VALUE = 10000;
const MODULE_NAME = 'BUCKETER';
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
  const decideReasons: string[] = [];
  // Check if user is in a random group; if so, check if user is bucketed into a specific experiment
  const experiment = bucketerParams.experimentIdMap[bucketerParams.experimentId];
  const groupId = experiment['groupId'];
  if (groupId) {
    const group = bucketerParams.groupIdMap[groupId];
    if (!group) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_GROUP_ID, MODULE_NAME, groupId));
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
        const notbucketedInAnyExperimentLogMessage = sprintf(
          LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT,
          MODULE_NAME,
          bucketerParams.userId,
          groupId
        );
        bucketerParams.logger.log(LOG_LEVEL.INFO, notbucketedInAnyExperimentLogMessage);
        decideReasons.push(notbucketedInAnyExperimentLogMessage);
        return {
          result: null,
          reasons: decideReasons,
        };
      }

      // Return if user is bucketed into a different experiment than the one specified
      if (bucketedExperimentId !== bucketerParams.experimentId) {
        const notBucketedIntoExperimentOfGroupLogMessage = sprintf(
          LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
          MODULE_NAME,
          bucketerParams.userId,
          bucketerParams.experimentKey,
          groupId
        );
        bucketerParams.logger.log(LOG_LEVEL.INFO, notBucketedIntoExperimentOfGroupLogMessage);
        decideReasons.push(notBucketedIntoExperimentOfGroupLogMessage);
        return {
          result: null,
          reasons: decideReasons,
        };
      }

      // Continue bucketing if user is bucketed into specified experiment
      const bucketedIntoExperimentOfGroupLogMessage = sprintf(
        LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
        MODULE_NAME,
        bucketerParams.userId,
        bucketerParams.experimentKey,
        groupId
      );
      bucketerParams.logger.log(LOG_LEVEL.INFO, bucketedIntoExperimentOfGroupLogMessage);
      decideReasons.push(bucketedIntoExperimentOfGroupLogMessage);
    }
  }
  const bucketingId = sprintf('%s%s', bucketerParams.bucketingId, bucketerParams.experimentId);
  const bucketValue = _generateBucketValue(bucketingId);

  const bucketedUserLogMessage = sprintf(
    LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET,
    MODULE_NAME,
    bucketValue,
    bucketerParams.userId
  );
  bucketerParams.logger.log(LOG_LEVEL.DEBUG, bucketedUserLogMessage);
  decideReasons.push(bucketedUserLogMessage);

  const entityId = _findBucket(bucketValue, bucketerParams.trafficAllocationConfig);
  if (entityId !== null) {
    if (!bucketerParams.variationIdMap[entityId]) {
      if (entityId) {
        const invalidVariationIdLogMessage = sprintf(LOG_MESSAGES.INVALID_VARIATION_ID, MODULE_NAME);
        bucketerParams.logger.log(LOG_LEVEL.WARNING, invalidVariationIdLogMessage);
        decideReasons.push(invalidVariationIdLogMessage);
      }
      return {
        result: null,
        reasons: decideReasons,
      };
    }
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
 * @param  {LogHandler}  logger       Logger implementation
 * @return {string|null}              ID of experiment if user is bucketed into experiment within the group, null otherwise
 */
export const bucketUserIntoExperiment = function(
  group: Group,
  bucketingId: string,
  userId: string,
  logger: LogHandler
): string | null {
  const bucketingKey = sprintf('%s%s', bucketingId, group.id);
  const bucketValue = _generateBucketValue(bucketingKey);
  logger.log(
    LOG_LEVEL.DEBUG,
    sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, MODULE_NAME, bucketValue, userId)
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

/**
 * Helper function to generate bucket value in half-closed interval [0, MAX_TRAFFIC_VALUE)
 * @param  {string}               bucketingKey          String value for bucketing
 * @return {number}               The generated bucket value
 * @throws                        If bucketing value is not a valid string
 */
export const _generateBucketValue = function(bucketingKey: string): number {
  try {
    // NOTE: the mmh library already does cast the hash value as an unsigned 32bit int
    // https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L115
    const hashValue = murmurhash.v3(bucketingKey, HASH_SEED);
    const ratio = hashValue / MAX_HASH_VALUE;
    return Math.floor(ratio * MAX_TRAFFIC_VALUE);
  } catch (ex) {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_BUCKETING_ID, MODULE_NAME, bucketingKey, ex.message));
  }
};

export default {
  bucket: bucket,
  bucketUserIntoExperiment: bucketUserIntoExperiment,
  _generateBucketValue: _generateBucketValue,
};
