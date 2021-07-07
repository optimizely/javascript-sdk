/****************************************************************************
 * Copyright 2017-2021 Optimizely, Inc. and contributors                    *
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
import { sprintf } from '@optimizely/js-sdk-utils';
import { LogHandler } from '@optimizely/js-sdk-logging';

import fns from '../../utils/fns';
import { bucket } from '../bucketer';
import {
  AUDIENCE_EVALUATION_TYPES,
  CONTROL_ATTRIBUTES,
  DECISION_SOURCES,
  ERROR_MESSAGES,
  LOG_LEVEL,
  LOG_MESSAGES,
} from '../../utils/enums';
import {
  getAudiencesById,
  getExperimentAudienceConditions,
  getExperimentFromId,
  getExperimentFromKey,
  getTrafficAllocation,
  getVariationIdFromExperimentAndVariationKey,
  getVariationKeyFromId,
  isActive,
  ProjectConfig,
} from '../project_config';
import { AudienceEvaluator, createAudienceEvaluator } from '../audience_evaluator';
import * as stringValidator from '../../utils/string_value_validator';
import {
  Variation,
  Experiment,
  UserProfile,
  FeatureFlag,
  UserAttributes,
  BucketerParams,
  DecisionResponse,
  UserProfileService,
  ExperimentBucketMap,
  OptimizelyDecideOption,
} from '../../shared_types';

const MODULE_NAME = 'DECISION_SERVICE';

export interface DecisionObj {
  experiment: Experiment | null;
  variation: Variation | null;
  decisionSource: string;
}

interface DecisionServiceOptions {
  userProfileService: UserProfileService | null;
  logger: LogHandler;
  UNSTABLE_conditionEvaluators: unknown;
}

/**
 * Optimizely's decision service that determines which variation of an experiment the user will be allocated to.
 *
 * The decision service contains all logic around how a user decision is made. This includes all of the following (in order):
 *   1. Checking experiment status
 *   2. Checking forced bucketing
 *   3. Checking whitelisting
 *   4. Checking user profile service for past bucketing decisions (sticky bucketing)
 *   5. Checking audience targeting
 *   6. Using Murmurhash3 to bucket the user.
 *
 * @constructor
 * @param   {DecisionServiceOptions}      options
 * @returns {DecisionService}
 */
export class DecisionService {
  private logger: LogHandler;
  private audienceEvaluator: AudienceEvaluator;
  private forcedVariationMap: { [key: string]: { [id: string]: string } };
  private userProfileService: UserProfileService | null;

  constructor(options: DecisionServiceOptions) {
    this.audienceEvaluator = createAudienceEvaluator(options.UNSTABLE_conditionEvaluators);
    this.forcedVariationMap = {};
    this.logger = options.logger;
    this.userProfileService = options.userProfileService || null;
  }

  /**
   * Gets variation where visitor will be bucketed.
   * @param  {ProjectConfig}                          configObj         The parsed project configuration object
   * @param  {string}                                 experimentKey
   * @param  {string}                                 userId
   * @param  {UserAttributes}                         attributes
   * @param  {[key: string]: boolean}                 options           Optional map of decide options
   * @return {DecisionResponse<string|null>}          DecisionResonse   DecisionResonse containing the variation the user is bucketed into
   *                                                                    and the decide reasons.
   */
  getVariation(
    configObj: ProjectConfig,
    experiment: Experiment,
    userId: string,
    attributes?: UserAttributes,
    options: { [key: string]: boolean } = {}
  ): DecisionResponse<string | null> {
    // by default, the bucketing ID should be the user ID
    const bucketingId = this.getBucketingId(userId, attributes);
    const decideReasons = [];
    const experimentKey = experiment.key;
    if (!this.checkIfExperimentIsActive(configObj, experimentKey)) {
      const experimentNotRunningLogMessage = sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, MODULE_NAME, experimentKey);
      this.logger.log(LOG_LEVEL.INFO, experimentNotRunningLogMessage);
      decideReasons.push(experimentNotRunningLogMessage);
      return {
        result: null,
        reasons: decideReasons,
      };
    }
    const decisionForcedVariation = this.getForcedVariation(configObj, experimentKey, userId);
    decideReasons.push(...decisionForcedVariation.reasons);
    const forcedVariationKey = decisionForcedVariation.result;

    if (forcedVariationKey) {
      return {
        result: forcedVariationKey,
        reasons: decideReasons,
      };
    }
    const decisionWhitelistedVariation = this.getWhitelistedVariation(experiment, userId);
    decideReasons.push(...decisionWhitelistedVariation.reasons);
    let variation = decisionWhitelistedVariation.result;
    if (variation) {
      return {
        result: variation.key,
        reasons: decideReasons,
      };
    }

    const shouldIgnoreUPS = options[OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE];
    const experimentBucketMap = this.resolveExperimentBucketMap(userId, attributes);

    // check for sticky bucketing if decide options do not include shouldIgnoreUPS
    if (!shouldIgnoreUPS) {
      variation = this.getStoredVariation(configObj, experiment, userId, experimentBucketMap);
      if (variation) {
        const returningStoredVariationMessage = sprintf(
          LOG_MESSAGES.RETURNING_STORED_VARIATION,
          MODULE_NAME,
          variation.key,
          experimentKey,
          userId
        );
        this.logger.log(
          LOG_LEVEL.INFO,
          returningStoredVariationMessage
        );
        decideReasons.push(returningStoredVariationMessage);
        return {
          result: variation.key,
          reasons: decideReasons,
        };
      }
    }

    // Perform regular targeting and bucketing
    const decisionifUserIsInAudience = this.checkIfUserIsInAudience(
      configObj,
      experiment,
      AUDIENCE_EVALUATION_TYPES.EXPERIMENT,
      attributes,
      ''
    );
    decideReasons.push(...decisionifUserIsInAudience.reasons);
    if (!decisionifUserIsInAudience.result) {
      const userDoesNotMeetConditionsLogMessage = sprintf(
        LOG_MESSAGES.USER_NOT_IN_EXPERIMENT,
        MODULE_NAME,
        userId,
        experimentKey
      );
      this.logger.log(LOG_LEVEL.INFO, userDoesNotMeetConditionsLogMessage);
      decideReasons.push(userDoesNotMeetConditionsLogMessage);
      return {
        result: null,
        reasons: decideReasons,
      };
    }

    const bucketerParams = this.buildBucketerParams(configObj, experiment, bucketingId, userId);
    const decisionVariation = bucket(bucketerParams);
    decideReasons.push(...decisionVariation.reasons);
    const variationId = decisionVariation.result;
    if (variationId) {
      variation = configObj.variationIdMap[variationId];
    }
    if (!variation) {
      const userHasNoVariationLogMessage = sprintf(
        LOG_MESSAGES.USER_HAS_NO_VARIATION,
        MODULE_NAME,
        userId,
        experimentKey
      );
      this.logger.log(LOG_LEVEL.DEBUG, userHasNoVariationLogMessage);
      decideReasons.push(userHasNoVariationLogMessage);
      return {
        result: null,
        reasons: decideReasons,
      };
    }

    const userInVariationLogMessage = sprintf(
      LOG_MESSAGES.USER_HAS_VARIATION,
      MODULE_NAME,
      userId,
      variation.key,
      experimentKey
    );
    this.logger.log(LOG_LEVEL.INFO, userInVariationLogMessage);
    decideReasons.push(userInVariationLogMessage);
    // persist bucketing if decide options do not include shouldIgnoreUPS
    if (!shouldIgnoreUPS) {
      this.saveUserProfile(experiment, variation, userId, experimentBucketMap);
    }

    return {
      result: variation.key,
      reasons: decideReasons,
    };
  }

  /**
   * Merges attributes from attributes[STICKY_BUCKETING_KEY] and userProfileService
   * @param  {string}               userId
   * @param  {UserAttributes}       attributes
   * @return {ExperimentBucketMap}  finalized copy of experiment_bucket_map
   */
  private resolveExperimentBucketMap(
    userId: string,
    attributes?: UserAttributes
  ): ExperimentBucketMap {
    attributes = attributes || {};

    const userProfile = this.getUserProfile(userId) || {} as UserProfile;
    const attributeExperimentBucketMap = attributes[CONTROL_ATTRIBUTES.STICKY_BUCKETING_KEY];
    return fns.assign({}, userProfile.experiment_bucket_map, attributeExperimentBucketMap);
  }

  /**
   * Checks whether the experiment is running
   * @param  {ProjectConfig}  configObj     The parsed project configuration object
   * @param  {string}         experimentKey Key of experiment being validated
   * @return {boolean}        True if experiment is running
   */
  private checkIfExperimentIsActive(configObj: ProjectConfig, experimentKey: string): boolean {
    return isActive(configObj, experimentKey);
  }

  /**
   * Checks if user is whitelisted into any variation and return that variation if so
   * @param  {Experiment}                                 experiment
   * @param  {string}                                     userId
   * @return {DecisionResponse<Variation|null>}           DecisionResponse containing the forced variation if it exists
   *                                                      or user ID and the decide reasons.
   */
  private getWhitelistedVariation(
    experiment: Experiment,
    userId: string
  ): DecisionResponse<Variation | null> {
    const decideReasons: string[] = [];
    if (experiment.forcedVariations && experiment.forcedVariations.hasOwnProperty(userId)) {
      const forcedVariationKey = experiment.forcedVariations[userId];
      if (experiment.variationKeyMap.hasOwnProperty(forcedVariationKey)) {
        const forcedBucketingSucceededMessageLog = sprintf(
          LOG_MESSAGES.USER_FORCED_IN_VARIATION,
          MODULE_NAME,
          userId,
          forcedVariationKey
        );
        this.logger.log(LOG_LEVEL.INFO, forcedBucketingSucceededMessageLog);
        decideReasons.push(forcedBucketingSucceededMessageLog);
        return {
          result: experiment.variationKeyMap[forcedVariationKey],
          reasons: decideReasons,
        };
      } else {
        const forcedBucketingFailedMessageLog = sprintf(
          LOG_MESSAGES.FORCED_BUCKETING_FAILED,
          MODULE_NAME,
          forcedVariationKey,
          userId
        );
        this.logger.log(LOG_LEVEL.ERROR, forcedBucketingFailedMessageLog);
        decideReasons.push(forcedBucketingFailedMessageLog);
        return {
          result: null,
          reasons: decideReasons,
        };
      }
    }

    return {
      result: null,
      reasons: decideReasons,
    };
  }

  /**
   * Checks whether the user is included in experiment audience
   * @param  {ProjectConfig}                configObj            The parsed project configuration object
   * @param  {string}                       experimentKey        Key of experiment being validated
   * @param  {string}                       evaluationAttribute  String representing experiment key or rule
   * @param  {string}                       userId               ID of user
   * @param  {UserAttributes}               attributes           Optional parameter for user's attributes
   * @param  {string}                       loggingKey           String representing experiment key or rollout rule. To be used in log messages only.
   * @return {DecisionResponse<boolean>}    DecisionResponse     DecisionResponse containing result true if user meets audience conditions and
   *                                                             the decide reasons.
   */
  private checkIfUserIsInAudience(
    configObj: ProjectConfig,
    experiment: Experiment,
    evaluationAttribute: string,
    attributes?: UserAttributes,
    loggingKey?: string | number,
  ): DecisionResponse<boolean> {
    const decideReasons: string[] = [];
    const experimentAudienceConditions = getExperimentAudienceConditions(configObj, experiment.id);
    const audiencesById = getAudiencesById(configObj);
    const evaluatingAudiencesCombinedMessage = sprintf(
      LOG_MESSAGES.EVALUATING_AUDIENCES_COMBINED,
      MODULE_NAME,
      evaluationAttribute,
      loggingKey || experiment.key,
      JSON.stringify(experimentAudienceConditions)
    );
    this.logger.log(
      LOG_LEVEL.DEBUG,
      evaluatingAudiencesCombinedMessage
    );
    decideReasons.push(evaluatingAudiencesCombinedMessage);
    const result = this.audienceEvaluator.evaluate(experimentAudienceConditions, audiencesById, attributes);
    const audienceEvaluationResultCombinedMessage = sprintf(
      LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
      MODULE_NAME,
      evaluationAttribute,
      loggingKey || experiment.key,
      result.toString().toUpperCase()
    );
    this.logger.log(
      LOG_LEVEL.INFO,
      audienceEvaluationResultCombinedMessage
    );
    decideReasons.push(audienceEvaluationResultCombinedMessage);

    return {
      result: result,
      reasons: decideReasons,
    };
  }

  /**
   * Given an experiment key and user ID, returns params used in bucketer call
   * @param  {ProjectConfig}         configObj     The parsed project configuration object
   * @param  {string}                experimentKey Experiment key used for bucketer
   * @param  {string}                bucketingId   ID to bucket user into
   * @param  {string}                userId        ID of user to be bucketed
   * @return {BucketerParams}
   */
  private buildBucketerParams(
    configObj: ProjectConfig,
    experiment: Experiment,
    bucketingId: string,
    userId: string
  ): BucketerParams {
    return {
      bucketingId,
      experimentId: experiment.id,
      experimentKey: experiment.key,
      experimentIdMap: configObj.experimentIdMap,
      experimentKeyMap: configObj.experimentKeyMap,
      groupIdMap: configObj.groupIdMap,
      logger: this.logger,
      trafficAllocationConfig: getTrafficAllocation(configObj, experiment.id),
      userId,
      variationIdMap: configObj.variationIdMap,
    }
  }

  /**
   * Pull the stored variation out of the experimentBucketMap for an experiment/userId
   * @param  {ProjectConfig}        configObj            The parsed project configuration object
   * @param  {Experiment}           experiment
   * @param  {string}               userId
   * @param  {ExperimentBucketMap}  experimentBucketMap  mapping experiment => { variation_id: <variationId> }
   * @return {Variation|null}       the stored variation or null if the user profile does not have one for the given experiment
   */
  private getStoredVariation(
    configObj: ProjectConfig,
    experiment: Experiment,
    userId: string,
    experimentBucketMap: ExperimentBucketMap
  ): Variation | null {
    if (experimentBucketMap.hasOwnProperty(experiment.id)) {
      const decision = experimentBucketMap[experiment.id];
      const variationId = decision.variation_id;
      if (configObj.variationIdMap.hasOwnProperty(variationId)) {
        return configObj.variationIdMap[decision.variation_id];
      } else {
        this.logger.log(
          LOG_LEVEL.INFO,
          sprintf(
            LOG_MESSAGES.SAVED_VARIATION_NOT_FOUND,
            MODULE_NAME, userId,
            variationId,
            experiment.key
          )
        );
      }
    }

    return null;
  }

  /**
   * Get the user profile with the given user ID
   * @param  {string} userId
   * @return {UserProfile|null} the stored user profile or null if one isn't found
   */
  private getUserProfile(userId: string): UserProfile | null {
    const userProfile = {
      user_id: userId,
      experiment_bucket_map: {},
    };

    if (!this.userProfileService) {
      return userProfile;
    }

    try {
      return this.userProfileService.lookup(userId);
    } catch (ex) {
      this.logger.log(
        LOG_LEVEL.ERROR,
        sprintf(ERROR_MESSAGES.USER_PROFILE_LOOKUP_ERROR, MODULE_NAME, userId, ex.message)
      );
    }

    return null;
  }

  /**
   * Saves the bucketing decision to the user profile
   * @param {Experiment}          experiment
   * @param {Variation}           variation
   * @param {string}              userId
   * @param {ExperimentBucketMap} experimentBucketMap
   */
  private saveUserProfile(
    experiment: Experiment,
    variation: Variation,
    userId: string,
    experimentBucketMap: ExperimentBucketMap
  ): void {
    if (!this.userProfileService) {
      return;
    }

    try {
      experimentBucketMap[experiment.id] = {
        variation_id: variation.id
      };

      this.userProfileService.save({
        user_id: userId,
        experiment_bucket_map: experimentBucketMap,
      });

      this.logger.log(
        LOG_LEVEL.INFO,
        sprintf(LOG_MESSAGES.SAVED_VARIATION, MODULE_NAME, variation.key, experiment.key, userId)
      );
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.USER_PROFILE_SAVE_ERROR, MODULE_NAME, userId, ex.message));
    }
  }

  /**
   * Given a feature, user ID, and attributes, returns a decision response containing 
   * an object representing a decision and decide reasons. If the user was bucketed into
   * a variation for the given feature and attributes, the decision object will have variation and
   * experiment properties (both objects), as well as a decisionSource property.
   * decisionSource indicates whether the decision was due to a rollout or an
   * experiment.
   * @param   {ProjectConfig}               configObj         The parsed project configuration object
   * @param   {FeatureFlag}                 feature           A feature flag object from project configuration
   * @param   {string}                      userId            A string identifying the user, for bucketing
   * @param   {UserAttributes}              attributes        Optional user attributes
   * @param   {[key: string]: boolean}      options           Map of decide options
   * @return  {DecisionResponse}            DecisionResponse  DecisionResponse containing an object with experiment, variation, and decisionSource
   *                                                          properties and decide reasons. If the user was not bucketed into a variation, the variation
   *                                                          property in decision object is null.
   */
  getVariationForFeature(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    userId: string,
    attributes?: UserAttributes,
    options: { [key: string]: boolean } = {}
  ): DecisionResponse<DecisionObj> {

    const decideReasons = [];
    const decisionVariation = this.getVariationForFeatureExperiment(configObj, feature, userId, attributes, options);
    decideReasons.push(...decisionVariation.reasons);
    const experimentDecision = decisionVariation.result;

    if (experimentDecision.variation !== null) {
      return {
        result: experimentDecision,
        reasons: decideReasons,
      };
    }

    const decisionRolloutVariation = this.getVariationForRollout(configObj, feature, userId, attributes);
    decideReasons.push(...decisionRolloutVariation.reasons);
    const rolloutDecision = decisionRolloutVariation.result;
    if (rolloutDecision.variation) {
      const userInRolloutMessage = sprintf(LOG_MESSAGES.USER_IN_ROLLOUT, MODULE_NAME, userId, feature.key);
      this.logger.log(LOG_LEVEL.DEBUG, userInRolloutMessage);
      decideReasons.push(userInRolloutMessage);
      return {
        result: rolloutDecision,
        reasons: decideReasons,
      };
    }

    const userNotInRolloutMessage = sprintf(LOG_MESSAGES.USER_NOT_IN_ROLLOUT, MODULE_NAME, userId, feature.key);
    this.logger.log(LOG_LEVEL.DEBUG, userNotInRolloutMessage);
    decideReasons.push(userNotInRolloutMessage);
    return {
      result: rolloutDecision,
      reasons: decideReasons,
    };
  }

  private getVariationForFeatureExperiment(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    userId: string,
    attributes?: UserAttributes,
    options: { [key: string]: boolean } = {}
  ): DecisionResponse<DecisionObj> {

    const decideReasons = [];
    let variationKey = null;
    let decisionVariation;
    let index;
    let variationForFeatureExperiment;

    // Check if the feature flag is under an experiment and the the user is bucketed into one of these experiments
    if (feature.experimentIds.length > 0) {
      // Evaluate each experiment ID and return the first bucketed experiment variation
      for (index = 0; index < feature.experimentIds.length; index++) {
        const experiment = getExperimentFromId(configObj, feature.experimentIds[index], this.logger);
        if (experiment) {
          decisionVariation = this.getVariation(configObj, experiment, userId, attributes, options);
          decideReasons.push(...decisionVariation.reasons);
          variationKey = decisionVariation.result;
          if (variationKey) {
            const variation = experiment.variationKeyMap[variationKey];
            variationForFeatureExperiment = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };

            return {
              result: variationForFeatureExperiment,
              reasons: decideReasons,
            }
          }
        }
      }
    } else {
      const featureHasNoExperimentsMessage = sprintf(LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS, MODULE_NAME, feature.key);
      this.logger.log(LOG_LEVEL.DEBUG, featureHasNoExperimentsMessage);
      decideReasons.push(featureHasNoExperimentsMessage);
    }

    variationForFeatureExperiment = {
      experiment: null,
      variation: null,
      decisionSource: DECISION_SOURCES.FEATURE_TEST,
    };

    return {
      result: variationForFeatureExperiment,
      reasons: decideReasons,
    };
  }

  private getVariationForRollout(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    userId: string,
    attributes?: UserAttributes
  ): DecisionResponse<DecisionObj> {
    const decideReasons = [];
    let decisionObj: DecisionObj;
    if (!feature.rolloutId) {
      const noRolloutExistsMessage = sprintf(LOG_MESSAGES.NO_ROLLOUT_EXISTS, MODULE_NAME, feature.key);
      this.logger.log(LOG_LEVEL.DEBUG, noRolloutExistsMessage);
      decideReasons.push(noRolloutExistsMessage);
      decisionObj = {
        experiment: null,
        variation: null,
        decisionSource: DECISION_SOURCES.ROLLOUT,
      };

      return {
        result: decisionObj,
        reasons: decideReasons,
      };
    }

    const rollout = configObj.rolloutIdMap[feature.rolloutId];
    if (!rollout) {
      const invalidRolloutIdMessage = sprintf(
        ERROR_MESSAGES.INVALID_ROLLOUT_ID,
        MODULE_NAME,
        feature.rolloutId,
        feature.key
      );
      this.logger.log(LOG_LEVEL.ERROR, invalidRolloutIdMessage);
      decideReasons.push(invalidRolloutIdMessage);
      decisionObj = {
        experiment: null,
        variation: null,
        decisionSource: DECISION_SOURCES.ROLLOUT,
      };
      return {
        result: decisionObj,
        reasons: decideReasons,
      };
    }

    if (rollout.experiments.length === 0) {
      const rolloutHasNoExperimentsMessage = sprintf(
        LOG_MESSAGES.ROLLOUT_HAS_NO_EXPERIMENTS,
        MODULE_NAME,
        feature.rolloutId
      );
      this.logger.log(LOG_LEVEL.ERROR, rolloutHasNoExperimentsMessage);
      decideReasons.push(rolloutHasNoExperimentsMessage);
      decisionObj = {
        experiment: null,
        variation: null,
        decisionSource: DECISION_SOURCES.ROLLOUT,
      };
      return {
        result: decisionObj,
        reasons: decideReasons,
      };
    }

    const bucketingId = this.getBucketingId(userId, attributes);

    // The end index is length - 1 because the last experiment is assumed to be
    // "everyone else", which will be evaluated separately outside this loop
    const endIndex = rollout.experiments.length - 1;
    let rolloutRule;
    let bucketerParams;
    let variationId;
    let variation;
    let loggingKey;
    let decisionVariation;
    let decisionifUserIsInAudience;
    for (let index = 0; index < endIndex; index++) {
      rolloutRule = configObj.experimentIdMap[rollout.experiments[index].id];
      loggingKey = index + 1;
      decisionifUserIsInAudience = this.checkIfUserIsInAudience(
        configObj,
        rolloutRule,
        AUDIENCE_EVALUATION_TYPES.RULE,
        attributes,
        loggingKey
      );
      decideReasons.push(...decisionifUserIsInAudience.reasons);
      if (!decisionifUserIsInAudience.result) {
        const userDoesNotMeetConditionsForTargetingRuleMessage = sprintf(
          LOG_MESSAGES.USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
          MODULE_NAME,
          userId,
          loggingKey
        );
        this.logger.log(
          LOG_LEVEL.DEBUG,
          userDoesNotMeetConditionsForTargetingRuleMessage
        );
        decideReasons.push(userDoesNotMeetConditionsForTargetingRuleMessage);
        continue;
      }

      const userMeetsConditionsForTargetingRuleMessage = sprintf(
        LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
        MODULE_NAME,
        userId,
        loggingKey
      );
      this.logger.log(
        LOG_LEVEL.DEBUG,
        userMeetsConditionsForTargetingRuleMessage
      );
      decideReasons.push(userMeetsConditionsForTargetingRuleMessage);
      bucketerParams = this.buildBucketerParams(configObj, rolloutRule, bucketingId, userId);
      decisionVariation = bucket(bucketerParams);
      decideReasons.push(...decisionVariation.reasons);
      variationId = decisionVariation.result;
      if (variationId) {
        variation = configObj.variationIdMap[variationId];
      }
      if (variation) {
        const userBucketeredIntoTargetingRuleMessage = sprintf(
          LOG_MESSAGES.USER_BUCKETED_INTO_TARGETING_RULE,
          MODULE_NAME, userId,
          loggingKey
        );
        this.logger.log(
          LOG_LEVEL.DEBUG,
          userBucketeredIntoTargetingRuleMessage
        );
        decideReasons.push(userBucketeredIntoTargetingRuleMessage);
        decisionObj = {
          experiment: rolloutRule,
          variation: variation,
          decisionSource: DECISION_SOURCES.ROLLOUT,
        };
        return {
          result: decisionObj,
          reasons: decideReasons,
        };
      } else {
        const userNotBucketeredIntoTargetingRuleMessage = sprintf(
          LOG_MESSAGES.USER_NOT_BUCKETED_INTO_TARGETING_RULE,
          MODULE_NAME, userId,
          loggingKey
        );
        this.logger.log(
          LOG_LEVEL.DEBUG,
          userNotBucketeredIntoTargetingRuleMessage
        );
        decideReasons.push(userNotBucketeredIntoTargetingRuleMessage);
        break;
      }
    }

    const everyoneElseRule = configObj.experimentKeyMap[rollout.experiments[endIndex].key];
    const decisionifUserIsInEveryoneRule = this.checkIfUserIsInAudience(
      configObj,
      everyoneElseRule,
      AUDIENCE_EVALUATION_TYPES.RULE,
      attributes,
      'Everyone Else'
    );
    decideReasons.push(...decisionifUserIsInEveryoneRule.reasons);
    if (decisionifUserIsInEveryoneRule.result) {
      const userMeetsConditionsForEveryoneTargetingRuleMessage = sprintf(
        LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
        MODULE_NAME, userId,
        'Everyone Else'
      );
      this.logger.log(
        LOG_LEVEL.DEBUG,
        userMeetsConditionsForEveryoneTargetingRuleMessage
      );
      decideReasons.push(userMeetsConditionsForEveryoneTargetingRuleMessage);
      bucketerParams = this.buildBucketerParams(configObj, everyoneElseRule, bucketingId, userId);
      decisionVariation = bucket(bucketerParams);
      decideReasons.push(...decisionVariation.reasons);
      variationId = decisionVariation.result;
      if (variationId) {
        variation = configObj.variationIdMap[variationId];
      }
      if (variation) {
        const userBucketeredIntoEveryoneTargetingRuleMessage = sprintf(
          LOG_MESSAGES.USER_BUCKETED_INTO_EVERYONE_TARGETING_RULE,
          MODULE_NAME,
          userId
        );
        this.logger.log(
          LOG_LEVEL.DEBUG,
          userBucketeredIntoEveryoneTargetingRuleMessage
        );
        decideReasons.push(userBucketeredIntoEveryoneTargetingRuleMessage);
        decisionObj = {
          experiment: everyoneElseRule,
          variation: variation,
          decisionSource: DECISION_SOURCES.ROLLOUT,
        };
        return {
          result: decisionObj,
          reasons: decideReasons,
        };
      } else {
        const userNotBucketeredIntoEveryoneTargetingRuleMessage = sprintf(
          LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EVERYONE_TARGETING_RULE,
          MODULE_NAME,
          userId
        );
        this.logger.log(
          LOG_LEVEL.DEBUG,
          userNotBucketeredIntoEveryoneTargetingRuleMessage
        );
        decideReasons.push(userNotBucketeredIntoEveryoneTargetingRuleMessage);
      }
    }

    decisionObj = {
      experiment: null,
      variation: null,
      decisionSource: DECISION_SOURCES.ROLLOUT,
    };
    return {
      result: decisionObj,
      reasons: decideReasons,
    };
  }

  /**
   * Get bucketing Id from user attributes.
   * @param   {string}          userId
   * @param   {UserAttributes}  attributes
   * @returns {string}          Bucketing Id if it is a string type in attributes, user Id otherwise.
   */
  private getBucketingId(userId: string, attributes?: UserAttributes): string {
    let bucketingId = userId;

    // If the bucketing ID key is defined in attributes, than use that in place of the userID for the murmur hash key
    if (
      attributes != null &&
      typeof attributes === 'object' &&
      attributes.hasOwnProperty(CONTROL_ATTRIBUTES.BUCKETING_ID)
    ) {
      if (typeof attributes[CONTROL_ATTRIBUTES.BUCKETING_ID] === 'string') {
        bucketingId = attributes[CONTROL_ATTRIBUTES.BUCKETING_ID];
        this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.VALID_BUCKETING_ID, MODULE_NAME, bucketingId));
      } else {
        this.logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.BUCKETING_ID_NOT_STRING, MODULE_NAME));
      }
    }

    return bucketingId;
  }

  /**
   * Removes forced variation for given userId and experimentKey
   * @param  {string} userId         String representing the user id
   * @param  {string} experimentId   Number representing the experiment id
   * @param  {string} experimentKey  Key representing the experiment id
   * @throws If the user id is not valid or not in the forced variation map
   */
  removeForcedVariation(userId: string, experimentId: string, experimentKey: string): void {
    if (!userId) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_ID, MODULE_NAME));
    }

    if (this.forcedVariationMap.hasOwnProperty(userId)) {
      delete this.forcedVariationMap[userId][experimentId];
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(LOG_MESSAGES.VARIATION_REMOVED_FOR_USER, MODULE_NAME, experimentKey, userId)
      );
    } else {
      throw new Error(sprintf(ERROR_MESSAGES.USER_NOT_IN_FORCED_VARIATION, MODULE_NAME, userId));
    }
  }

  /**
   * Sets forced variation for given userId and experimentKey
   * @param  {string} userId        String representing the user id
   * @param  {string} experimentId  Number representing the experiment id
   * @param  {number} variationId   Number representing the variation id
   * @throws If the user id is not valid
   */
  private setInForcedVariationMap(userId: string, experimentId: string, variationId: string): void {
    if (this.forcedVariationMap.hasOwnProperty(userId)) {
      this.forcedVariationMap[userId][experimentId] = variationId;
    } else {
      this.forcedVariationMap[userId] = {};
      this.forcedVariationMap[userId][experimentId] = variationId;
    }

    this.logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, MODULE_NAME, variationId, experimentId, userId)
    );
  }

  /**
   * Gets the forced variation key for the given user and experiment.
   * @param  {ProjectConfig}                  configObj         Object representing project configuration
   * @param  {string}                         experimentKey     Key for experiment.
   * @param  {string}                         userId            The user Id.
   * @return {DecisionResponse<string|null>}                    DecisionResponse  DecisionResponse containing variation which the given user and experiment
   *                                                            should be forced into and the decide reasons.
   */
  getForcedVariation(
    configObj: ProjectConfig,
    experimentKey: string,
    userId: string
  ): DecisionResponse<string | null> {
    const decideReasons: string[] = [];
    const experimentToVariationMap = this.forcedVariationMap[userId];
    if (!experimentToVariationMap) {
      this.logger.log(LOG_LEVEL.DEBUG,
        sprintf(
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
          MODULE_NAME,
          userId
        )
      );

      return {
        result: null,
        reasons: decideReasons,
      };
    }

    let experimentId;
    try {
      const experiment = getExperimentFromKey(configObj, experimentKey);
      if (experiment.hasOwnProperty('id')) {
        experimentId = experiment['id'];
      } else {
        // catching improperly formatted experiments
        const improperlyFormattedExperimentMessage = sprintf(
          ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT,
          MODULE_NAME,
          experimentKey
        );
        this.logger.log(LOG_LEVEL.ERROR, improperlyFormattedExperimentMessage);
        decideReasons.push(improperlyFormattedExperimentMessage);

        return {
          result: null,
          reasons: decideReasons,
        };
      }
    } catch (ex) {
      // catching experiment not in datafile
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      decideReasons.push(ex.message);

      return {
        result: null,
        reasons: decideReasons,
      };
    }

    const variationId = experimentToVariationMap[experimentId];
    if (!variationId) {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
          MODULE_NAME,
          experimentKey,
          userId
        )
      );
      return {
        result: null,
        reasons: decideReasons,
      };
    }

    const variationKey = getVariationKeyFromId(configObj, variationId);
    if (variationKey) {
      const userHasForcedVariationMessage = sprintf(
        LOG_MESSAGES.USER_HAS_FORCED_VARIATION,
        MODULE_NAME,
        variationKey,
        experimentKey,
        userId
      );
      this.logger.log(LOG_LEVEL.DEBUG, userHasForcedVariationMessage);
      decideReasons.push(userHasForcedVariationMessage);
    } else {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
          MODULE_NAME,
          experimentKey,
          userId
        )
      );
    }

    return {
      result: variationKey,
      reasons: decideReasons,
    };
  }

  /**
   * Sets the forced variation for a user in a given experiment
   * @param  {ProjectConfig}  configObj      Object representing project configuration
   * @param  {string}         experimentKey  Key for experiment.
   * @param  {string}         userId         The user Id.
   * @param  {string|null}    variationKey   Key for variation. If null, then clear the existing experiment-to-variation mapping
   * @return {boolean}     A boolean value that indicates if the set completed successfully.
   */
  setForcedVariation(
    configObj: ProjectConfig,
    experimentKey: string,
    userId: string,
    variationKey: string | null
  ): boolean {
    if (variationKey != null && !stringValidator.validate(variationKey)) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.INVALID_VARIATION_KEY, MODULE_NAME));
      return false;
    }

    let experimentId;
    try {
      const experiment = getExperimentFromKey(configObj, experimentKey);
      if (experiment.hasOwnProperty('id')) {
        experimentId = experiment['id'];
      } else {
        // catching improperly formatted experiments
        this.logger.log(
          LOG_LEVEL.ERROR,
          sprintf(ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT, MODULE_NAME, experimentKey)
        );
        return false;
      }
    } catch (ex) {
      // catching experiment not in datafile
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      return false;
    }

    if (variationKey == null) {
      try {
        this.removeForcedVariation(userId, experimentId, experimentKey);
        return true;
      } catch (ex) {
        this.logger.log(LOG_LEVEL.ERROR, ex.message);
        return false;
      }
    }

    const variationId = getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);

    if (!variationId) {
      this.logger.log(
        LOG_LEVEL.ERROR,
        sprintf(ERROR_MESSAGES.NO_VARIATION_FOR_EXPERIMENT_KEY, MODULE_NAME, variationKey, experimentKey)
      );
      return false;
    }

    try {
      this.setInForcedVariationMap(userId, experimentId, variationId);
      return true;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      return false;
    }
  }
}

/**
 * Creates an instance of the DecisionService.
 * @param  {DecisionServiceOptions}     options       Configuration options
 * @return {Object}                     An instance of the DecisionService
 */
export function createDecisionService(options: DecisionServiceOptions): DecisionService {
  return new DecisionService(options);
}
