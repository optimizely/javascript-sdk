/****************************************************************************
 * Copyright 2017-2022 Optimizely, Inc. and contributors                    *
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
import { LogHandler } from '@optimizely/js-sdk-logging';
import { sprintf } from '../../utils/fns';

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
  getFlagVariationByKey,
  getTrafficAllocation,
  getVariationIdFromExperimentAndVariationKey,
  getVariationFromId,
  getVariationKeyFromId,
  isActive,
  ProjectConfig,
} from '../project_config';
import { AudienceEvaluator, createAudienceEvaluator } from '../audience_evaluator';
import * as stringValidator from '../../utils/string_value_validator';
import {
  BucketerParams,
  DecisionResponse,
  Experiment,
  ExperimentBucketMap,
  FeatureFlag,
  OptimizelyDecideOption,
  OptimizelyUserContext,
  UserAttributes,
  UserProfile,
  UserProfileService,
  Variation,
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

interface DeliveryRuleResponse<T, K> extends DecisionResponse<T> {
  skipToEveryoneElse: K;
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
   * @param  {Experiment}                             experiment
   * @param  {OptimizelyUserContext}                  user              A user context
   * @param  {[key: string]: boolean}                 options           Optional map of decide options
   * @return {DecisionResponse<string|null>}          DecisionResponse containing the variation the user is bucketed into
   *                                                                    and the decide reasons.
   */
  getVariation(
    configObj: ProjectConfig,
    experiment: Experiment,
    user: OptimizelyUserContext,
    options: { [key: string]: boolean } = {}
  ): DecisionResponse<string | null> {
    const userId = user.getUserId();
    const attributes = user.getAttributes();
    // by default, the bucketing ID should be the user ID
    const bucketingId = this.getBucketingId(userId, attributes);
    const decideReasons: (string | number)[][] = [];
    const experimentKey = experiment.key;
    if (!this.checkIfExperimentIsActive(configObj, experimentKey)) {
      this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, MODULE_NAME, experimentKey);
      decideReasons.push([LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, MODULE_NAME, experimentKey]);
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
        this.logger.log(
          LOG_LEVEL.INFO,
          LOG_MESSAGES.RETURNING_STORED_VARIATION,
          MODULE_NAME,
          variation.key,
          experimentKey,
          userId,
        );
        decideReasons.push([
          LOG_MESSAGES.RETURNING_STORED_VARIATION,
          MODULE_NAME,
          variation.key,
          experimentKey,
          userId,
        ]);
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
      this.logger.log(
        LOG_LEVEL.INFO,
        LOG_MESSAGES.USER_NOT_IN_EXPERIMENT,
        MODULE_NAME,
        userId,
        experimentKey,
      );
      decideReasons.push([
        LOG_MESSAGES.USER_NOT_IN_EXPERIMENT,
        MODULE_NAME,
        userId,
        experimentKey,
      ]);
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
      this.logger.log(
        LOG_LEVEL.DEBUG,
        LOG_MESSAGES.USER_HAS_NO_VARIATION,
        MODULE_NAME,
        userId,
        experimentKey,
      );
      decideReasons.push([
        LOG_MESSAGES.USER_HAS_NO_VARIATION,
        MODULE_NAME,
        userId,
        experimentKey,
      ]);
      return {
        result: null,
        reasons: decideReasons,
      };
    }

    this.logger.log(
      LOG_LEVEL.INFO,
      LOG_MESSAGES.USER_HAS_VARIATION,
      MODULE_NAME,
      userId,
      variation.key,
      experimentKey,
    );
    decideReasons.push([
      LOG_MESSAGES.USER_HAS_VARIATION,
      MODULE_NAME,
      userId,
      variation.key,
      experimentKey,
    ]);
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
    const decideReasons: (string | number)[][] = [];
    if (experiment.forcedVariations && experiment.forcedVariations.hasOwnProperty(userId)) {
      const forcedVariationKey = experiment.forcedVariations[userId];
      if (experiment.variationKeyMap.hasOwnProperty(forcedVariationKey)) {
        this.logger.log(
          LOG_LEVEL.INFO,
          LOG_MESSAGES.USER_FORCED_IN_VARIATION,
          MODULE_NAME,
          userId,
          forcedVariationKey,
        );
        decideReasons.push([
          LOG_MESSAGES.USER_FORCED_IN_VARIATION,
          MODULE_NAME,
          userId,
          forcedVariationKey,
        ]);
        return {
          result: experiment.variationKeyMap[forcedVariationKey],
          reasons: decideReasons,
        };
      } else {
        this.logger.log(
          LOG_LEVEL.ERROR,
          LOG_MESSAGES.FORCED_BUCKETING_FAILED,
          MODULE_NAME,
          forcedVariationKey,
          userId,
        );
        decideReasons.push([
          LOG_MESSAGES.FORCED_BUCKETING_FAILED,
          MODULE_NAME,
          forcedVariationKey,
          userId,
        ]);
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
    const decideReasons: (string | number)[][] = [];
    const experimentAudienceConditions = getExperimentAudienceConditions(configObj, experiment.id);
    const audiencesById = getAudiencesById(configObj);
    this.logger.log(
      LOG_LEVEL.DEBUG,
      LOG_MESSAGES.EVALUATING_AUDIENCES_COMBINED,
      MODULE_NAME,
      evaluationAttribute,
      loggingKey || experiment.key,
      JSON.stringify(experimentAudienceConditions),
    );
    decideReasons.push([
      LOG_MESSAGES.EVALUATING_AUDIENCES_COMBINED,
      MODULE_NAME,
      evaluationAttribute,
      loggingKey || experiment.key,
      JSON.stringify(experimentAudienceConditions),
    ]);
    const result = this.audienceEvaluator.evaluate(experimentAudienceConditions, audiencesById, attributes);
    this.logger.log(
      LOG_LEVEL.INFO,
      LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
      MODULE_NAME,
      evaluationAttribute,
      loggingKey || experiment.key,
      result.toString().toUpperCase(),
    );
    decideReasons.push([
      LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
      MODULE_NAME,
      evaluationAttribute,
      loggingKey || experiment.key,
      result.toString().toUpperCase(),
    ]);

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
          LOG_MESSAGES.SAVED_VARIATION_NOT_FOUND,
          MODULE_NAME, userId,
          variationId,
          experiment.key,
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
        ERROR_MESSAGES.USER_PROFILE_LOOKUP_ERROR,
        MODULE_NAME,
        userId,
        ex.message,
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
        LOG_MESSAGES.SAVED_VARIATION,
        MODULE_NAME,
        variation.key,
        experiment.key,
        userId,
      );
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.USER_PROFILE_SAVE_ERROR, MODULE_NAME, userId, ex.message);
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
   * @param   {OptimizelyUserContext}       user              A user context
   * @param   {[key: string]: boolean}      options           Map of decide options
   * @return  {DecisionResponse}            DecisionResponse  DecisionResponse containing an object with experiment, variation, and decisionSource
   *                                                          properties and decide reasons. If the user was not bucketed into a variation, the variation
   *                                                          property in decision object is null.
   */
  getVariationForFeature(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    user: OptimizelyUserContext,
    options: { [key: string]: boolean } = {}
  ): DecisionResponse<DecisionObj> {

    const decideReasons: (string | number)[][] = [];
    const decisionVariation = this.getVariationForFeatureExperiment(configObj, feature, user, options);
    decideReasons.push(...decisionVariation.reasons);
    const experimentDecision = decisionVariation.result;

    if (experimentDecision.variation !== null) {
      return {
        result: experimentDecision,
        reasons: decideReasons,
      };
    }

    const decisionRolloutVariation = this.getVariationForRollout(configObj, feature, user);
    decideReasons.push(...decisionRolloutVariation.reasons);
    const rolloutDecision = decisionRolloutVariation.result;
    const userId = user.getUserId();
    if (rolloutDecision.variation) {
      this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_IN_ROLLOUT, MODULE_NAME, userId, feature.key);
      decideReasons.push([LOG_MESSAGES.USER_IN_ROLLOUT, MODULE_NAME, userId, feature.key]);
      return {
        result: rolloutDecision,
        reasons: decideReasons,
      };
    }

    this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.USER_NOT_IN_ROLLOUT, MODULE_NAME, userId, feature.key);
    decideReasons.push([LOG_MESSAGES.USER_NOT_IN_ROLLOUT, MODULE_NAME, userId, feature.key]);
    return {
      result: rolloutDecision,
      reasons: decideReasons,
    };
  }

  private getVariationForFeatureExperiment(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    user: OptimizelyUserContext,
    options: { [key: string]: boolean } = {}
  ): DecisionResponse<DecisionObj> {

    const decideReasons: (string | number)[][] = [];
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
          decisionVariation = this.getVariationFromExperimentRule(configObj, feature.key, experiment, user, options);
          decideReasons.push(...decisionVariation.reasons);
          variationKey = decisionVariation.result;
          if (variationKey) {
            let variation = null;
            variation = experiment.variationKeyMap[variationKey];
            if (!variation) {
              variation = getFlagVariationByKey(configObj, feature.key, variationKey);
            }
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
      this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS, MODULE_NAME, feature.key);
      decideReasons.push([LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS, MODULE_NAME, feature.key]);
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
    user: OptimizelyUserContext,
  ): DecisionResponse<DecisionObj> {
    const decideReasons: (string | number)[][] = [];
    let decisionObj: DecisionObj;
    if (!feature.rolloutId) {
      this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.NO_ROLLOUT_EXISTS, MODULE_NAME, feature.key);
      decideReasons.push([LOG_MESSAGES.NO_ROLLOUT_EXISTS, MODULE_NAME, feature.key]);
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
      this.logger.log(
        LOG_LEVEL.ERROR,
        ERROR_MESSAGES.INVALID_ROLLOUT_ID,
        MODULE_NAME,
        feature.rolloutId,
        feature.key,
      );
      decideReasons.push([ERROR_MESSAGES.INVALID_ROLLOUT_ID, MODULE_NAME, feature.rolloutId, feature.key]);
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

    const rolloutRules = rollout.experiments;
    if (rolloutRules.length === 0) {
      this.logger.log(
        LOG_LEVEL.ERROR,
        LOG_MESSAGES.ROLLOUT_HAS_NO_EXPERIMENTS,
        MODULE_NAME,
        feature.rolloutId,
      );
      decideReasons.push([LOG_MESSAGES.ROLLOUT_HAS_NO_EXPERIMENTS, MODULE_NAME, feature.rolloutId]);
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
    let decisionVariation;
    let skipToEveryoneElse;
    let variation;
    let rolloutRule;
    let index = 0;
    while (index < rolloutRules.length) {
      decisionVariation = this.getVariationFromDeliveryRule(configObj, feature.key, rolloutRules, index, user);
      decideReasons.push(...decisionVariation.reasons);
      variation = decisionVariation.result;
      skipToEveryoneElse = decisionVariation.skipToEveryoneElse;
      if (variation) {
        rolloutRule = configObj.experimentIdMap[rolloutRules[index].id];
        decisionObj = {
          experiment: rolloutRule,
          variation: variation,
          decisionSource: DECISION_SOURCES.ROLLOUT
        };
        return {
          result: decisionObj,
          reasons: decideReasons,
        };
      }
      // the last rule is special for "Everyone Else"
      index = skipToEveryoneElse ? (rolloutRules.length - 1) : (index + 1);
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
        this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.VALID_BUCKETING_ID, MODULE_NAME, bucketingId);
      } else {
        this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.BUCKETING_ID_NOT_STRING, MODULE_NAME);
      }
    }

    return bucketingId;
  }

  /**
   * Finds a validated forced decision for specific flagKey and optional ruleKey.
   * @param     {ProjectConfig}         config               A projectConfig.
   * @param     {OptimizelyUserContext} user                 A Optimizely User Context.
   * @param     {string}                flagKey              A flagKey.
   * @param     {ruleKey}               ruleKey              A ruleKey (optional).
   * @return    {DecisionResponse<Variation|null>}  DecisionResponse object containing valid variation object and decide reasons.
   */
   findValidatedForcedDecision(
    config: ProjectConfig,
    user: OptimizelyUserContext,
    flagKey: string,
    ruleKey?: string
  ): DecisionResponse<Variation | null> {

    const decideReasons: (string | number)[][] = [];
    const forcedDecision = user.getForcedDecision({ flagKey, ruleKey });
    let variation = null;
    let variationKey;
    const userId = user.getUserId()
    if (config && forcedDecision) {
      variationKey = forcedDecision.variationKey;
      variation = getFlagVariationByKey(config, flagKey, variationKey);
      if (variation) {
        if (ruleKey) {
          this.logger.log(
            LOG_LEVEL.INFO,
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
            variationKey,
            flagKey,
            ruleKey,
            userId
          );
          decideReasons.push([
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
            variationKey,
            flagKey,
            ruleKey,
            userId
          ]);
        } else {
          this.logger.log(
            LOG_LEVEL.INFO,
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
            variationKey,
            flagKey,
            userId
          );
          decideReasons.push([
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
            variationKey,
            flagKey,
            userId
          ])
        }
      } else {
        if (ruleKey) {
          this.logger.log(
            LOG_LEVEL.INFO,
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
            flagKey,
            ruleKey,
            userId
          );
          decideReasons.push([
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
            flagKey,
            ruleKey,
            userId
          ]);
        } else {
          this.logger.log(
            LOG_LEVEL.INFO,
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
            flagKey,
            userId
          );
          decideReasons.push([
            LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
            flagKey,
            userId
          ])
        }
      }
    }

    return {
      result: variation,
      reasons: decideReasons,
    }
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
        LOG_MESSAGES.VARIATION_REMOVED_FOR_USER,
        MODULE_NAME,
        experimentKey,
        userId,
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
      LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION,
      MODULE_NAME,
      variationId,
      experimentId,
      userId,
    );
  }

  /**
   * Gets the forced variation key for the given user and experiment.
   * @param  {ProjectConfig}                  configObj         Object representing project configuration
   * @param  {string}                         experimentKey     Key for experiment.
   * @param  {string}                         userId            The user Id.
   * @return {DecisionResponse<string|null>}                    DecisionResponse containing variation which the given user and experiment
   *                                                            should be forced into and the decide reasons.
   */
  getForcedVariation(
    configObj: ProjectConfig,
    experimentKey: string,
    userId: string
  ): DecisionResponse<string | null> {
    const decideReasons: (string | number)[][] = [];
    const experimentToVariationMap = this.forcedVariationMap[userId];
    if (!experimentToVariationMap) {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
        MODULE_NAME,
        userId,
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
        this.logger.log(
          LOG_LEVEL.ERROR,
          ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT,
          MODULE_NAME,
          experimentKey,
        );
        decideReasons.push([
          ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT,
          MODULE_NAME,
          experimentKey,
        ]);

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
        LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
        MODULE_NAME,
        experimentKey,
        userId,
      );
      return {
        result: null,
        reasons: decideReasons,
      };
    }

    const variationKey = getVariationKeyFromId(configObj, variationId);
    if (variationKey) {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        LOG_MESSAGES.USER_HAS_FORCED_VARIATION,
        MODULE_NAME,
        variationKey,
        experimentKey,
        userId,
      );
      decideReasons.push([
        LOG_MESSAGES.USER_HAS_FORCED_VARIATION,
        MODULE_NAME,
        variationKey,
        experimentKey,
        userId,
      ]);
    } else {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
        MODULE_NAME,
        experimentKey,
        userId,
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
      this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.INVALID_VARIATION_KEY, MODULE_NAME);
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
          ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT,
          MODULE_NAME,
          experimentKey,
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
        ERROR_MESSAGES.NO_VARIATION_FOR_EXPERIMENT_KEY,
        MODULE_NAME,
        variationKey,
        experimentKey,
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

  getVariationFromExperimentRule(
    configObj: ProjectConfig,
    flagKey: string,
    rule: Experiment,
    user: OptimizelyUserContext,
    options: { [key: string]: boolean } = {}
  ): DecisionResponse<string | null> {
    const decideReasons: (string | number)[][] = [];

    // check forced decision first
    const forcedDecisionResponse = this.findValidatedForcedDecision(configObj, user, flagKey, rule.key);
    decideReasons.push(...forcedDecisionResponse.reasons);

    const forcedVariaton = forcedDecisionResponse.result;
    if (forcedVariaton) {
      return {
        result: forcedVariaton.key,
        reasons: decideReasons,
      };
    }
    const decisionVariation = this.getVariation(configObj, rule, user, options);
    decideReasons.push(...decisionVariation.reasons);
    const variationKey = decisionVariation.result;

    return {
      result: variationKey,
      reasons: decideReasons,
    };
  }

  getVariationFromDeliveryRule(
    configObj: ProjectConfig,
    flagKey: string,
    rules: Experiment[],
    ruleIndex: number,
    user: OptimizelyUserContext
  ): DeliveryRuleResponse<Variation | null, boolean> {
    const decideReasons: (string | number)[][] = [];
    let skipToEveryoneElse = false;

    // check forced decision first
    const rule = rules[ruleIndex];
    const forcedDecisionResponse = this.findValidatedForcedDecision(configObj, user, flagKey, rule.key);
    decideReasons.push(...forcedDecisionResponse.reasons);

    const forcedVariaton = forcedDecisionResponse.result;
    if (forcedVariaton) {
      return {
        result: forcedVariaton,
        reasons: decideReasons,
        skipToEveryoneElse,
      };
    }

    const userId = user.getUserId();
    const attributes = user.getAttributes();
    const bucketingId = this.getBucketingId(userId, attributes);
    const everyoneElse = ruleIndex === rules.length - 1;
    const loggingKey = everyoneElse ? "Everyone Else" : ruleIndex + 1;

    let bucketedVariation = null;
    let bucketerVariationId;
    let bucketerParams;
    let decisionVariation;
    const decisionifUserIsInAudience = this.checkIfUserIsInAudience(
      configObj,
      rule,
      AUDIENCE_EVALUATION_TYPES.RULE,
      attributes,
      loggingKey
    );
    decideReasons.push(...decisionifUserIsInAudience.reasons);
    if (decisionifUserIsInAudience.result) {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
        MODULE_NAME,
        userId,
        loggingKey
      );
      decideReasons.push([
        LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
        MODULE_NAME,
        userId,
        loggingKey
      ]);

      bucketerParams = this.buildBucketerParams(configObj, rule, bucketingId, userId);
      decisionVariation = bucket(bucketerParams);
      decideReasons.push(...decisionVariation.reasons);
      bucketerVariationId = decisionVariation.result;
      if (bucketerVariationId) {
        bucketedVariation = getVariationFromId(configObj, bucketerVariationId);
      }
      if (bucketedVariation) {
        this.logger.log(
          LOG_LEVEL.DEBUG,
          LOG_MESSAGES.USER_BUCKETED_INTO_TARGETING_RULE,
          MODULE_NAME,
          userId,
          loggingKey
        );
        decideReasons.push([
          LOG_MESSAGES.USER_BUCKETED_INTO_TARGETING_RULE,
          MODULE_NAME,
          userId,
          loggingKey]);
      } else if (!everyoneElse) {
        // skip this logging for EveryoneElse since this has a message not for EveryoneElse
        this.logger.log(
          LOG_LEVEL.DEBUG,
          LOG_MESSAGES.USER_NOT_BUCKETED_INTO_TARGETING_RULE,
          MODULE_NAME,
          userId,
          loggingKey
        );
        decideReasons.push([
          LOG_MESSAGES.USER_NOT_BUCKETED_INTO_TARGETING_RULE,
          MODULE_NAME,
          userId,
          loggingKey
        ]);

        // skip the rest of rollout rules to the everyone-else rule if audience matches but not bucketed
        skipToEveryoneElse = true;
      }
    } else {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        LOG_MESSAGES.USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
        MODULE_NAME,
        userId,
        loggingKey
      );
      decideReasons.push([
        LOG_MESSAGES.USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
        MODULE_NAME,
        userId,
        loggingKey
      ]);
    }

    return {
      result: bucketedVariation,
      reasons: decideReasons,
      skipToEveryoneElse,
    };
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
