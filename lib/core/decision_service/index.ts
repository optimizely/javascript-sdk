/**
 * Copyright 2017-2022, 2024, Optimizely
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
import { LoggerFacade } from '../../logging/logger'
import { bucket } from '../bucketer';
import {
  AUDIENCE_EVALUATION_TYPES,
  CONTROL_ATTRIBUTES,
  DECISION_SOURCES,
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
} from '../../project_config/project_config';
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
import {
  INVALID_USER_ID,
  INVALID_VARIATION_KEY,
  NO_VARIATION_FOR_EXPERIMENT_KEY,
  USER_NOT_IN_FORCED_VARIATION,
  USER_PROFILE_LOOKUP_ERROR,
  USER_PROFILE_SAVE_ERROR,
  BUCKETING_ID_NOT_STRING,
} from 'error_message';

import {
  SAVED_USER_VARIATION,
  SAVED_VARIATION_NOT_FOUND,
  USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
  USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
  USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
  USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
  USER_HAS_NO_FORCED_VARIATION,
  USER_MAPPED_TO_FORCED_VARIATION,
  USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
  VALID_BUCKETING_ID,
  VARIATION_REMOVED_FOR_USER,
} from 'log_message';
import { OptimizelyError } from '../../error/optimizly_error';

export const EXPERIMENT_NOT_RUNNING = 'Experiment %s is not running.';
export const RETURNING_STORED_VARIATION =
  'Returning previously activated variation "%s" of experiment "%s" for user "%s" from user profile.';
export const USER_NOT_IN_EXPERIMENT = 'User %s does not meet conditions to be in experiment %s.';
export const USER_HAS_NO_VARIATION = 'User %s is in no variation of experiment %s.';
export const USER_HAS_VARIATION = 'User %s is in variation %s of experiment %s.';
export const USER_FORCED_IN_VARIATION = 'User %s is forced in variation %s.';
export const FORCED_BUCKETING_FAILED = 'Variation key %s is not in datafile. Not activating user %s.';
export const EVALUATING_AUDIENCES_COMBINED = 'Evaluating audiences for %s "%s": %s.';
export const AUDIENCE_EVALUATION_RESULT_COMBINED = 'Audiences for %s %s collectively evaluated to %s.';
export const USER_IN_ROLLOUT = 'User %s is in rollout of feature %s.';
export const USER_NOT_IN_ROLLOUT =  'User %s is not in rollout of feature %s.';
export const FEATURE_HAS_NO_EXPERIMENTS = 'Feature %s is not attached to any experiments.';
export const USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE =
  'User %s does not meet conditions for targeting rule %s.';
export const USER_NOT_BUCKETED_INTO_TARGETING_RULE =
'User %s not bucketed into targeting rule %s due to traffic allocation. Trying everyone rule.';
export const USER_BUCKETED_INTO_TARGETING_RULE = 'User %s bucketed into targeting rule %s.';
export const NO_ROLLOUT_EXISTS = 'There is no rollout of feature %s.';
export const INVALID_ROLLOUT_ID = 'Invalid rollout ID %s attached to feature %s';
export const ROLLOUT_HAS_NO_EXPERIMENTS = 'Rollout of feature %s has no experiments';
export const IMPROPERLY_FORMATTED_EXPERIMENT = 'Experiment key %s is improperly formatted.';
export const USER_HAS_FORCED_VARIATION =
  'Variation %s is mapped to experiment %s and user %s in the forced variation map.';
export const USER_MEETS_CONDITIONS_FOR_TARGETING_RULE = 'User %s meets conditions for targeting rule %s.';

export interface DecisionObj {
  experiment: Experiment | null;
  variation: Variation | null;
  decisionSource: string;
}

interface DecisionServiceOptions {
  userProfileService: UserProfileService | null;
  logger?: LoggerFacade;
  UNSTABLE_conditionEvaluators: unknown;
}

interface DeliveryRuleResponse<T, K> extends DecisionResponse<T> {
  skipToEveryoneElse: K;
}

interface UserProfileTracker {
  userProfile: ExperimentBucketMap | null;
  isProfileUpdated: boolean;
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
  private logger?: LoggerFacade;
  private audienceEvaluator: AudienceEvaluator;
  private forcedVariationMap: { [key: string]: { [id: string]: string } };
  private userProfileService: UserProfileService | null;

  constructor(options: DecisionServiceOptions) {
    this.logger = options.logger;
    this.audienceEvaluator = createAudienceEvaluator(options.UNSTABLE_conditionEvaluators, this.logger);
    this.forcedVariationMap = {};
    this.userProfileService = options.userProfileService || null;
  }

  /**
   * Resolves the variation into which the visitor will be bucketed.
   *
   * @param {ProjectConfig} configObj - The parsed project configuration object.
   * @param {Experiment} experiment - The experiment for which the variation is being resolved.
   * @param {OptimizelyUserContext} user - The user context associated with this decision.
   * @returns {DecisionResponse<string|null>} - A DecisionResponse containing the variation the user is bucketed into,
   *                                            along with the decision reasons.
   */
  private resolveVariation(
    configObj: ProjectConfig,
    experiment: Experiment,
    user: OptimizelyUserContext,
    shouldIgnoreUPS: boolean,
    userProfileTracker: UserProfileTracker
  ): DecisionResponse<string | null> { 
    const userId = user.getUserId();
    const attributes = user.getAttributes();
    // by default, the bucketing ID should be the user ID
    const bucketingId = this.getBucketingId(userId, attributes);
    const decideReasons: (string | number)[][] = [];
    const experimentKey = experiment.key;
    if (!this.checkIfExperimentIsActive(configObj, experimentKey)) {
      this.logger?.info(EXPERIMENT_NOT_RUNNING, experimentKey);
      decideReasons.push([EXPERIMENT_NOT_RUNNING, experimentKey]);
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


    // check for sticky bucketing if decide options do not include shouldIgnoreUPS
    if (!shouldIgnoreUPS) {
      variation = this.getStoredVariation(configObj, experiment, userId, userProfileTracker.userProfile);
      if (variation) {
        this.logger?.info(
          RETURNING_STORED_VARIATION,
          variation.key,
          experimentKey,
          userId,
        );
        decideReasons.push([
          RETURNING_STORED_VARIATION,
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
      user,
      ''
    );
    decideReasons.push(...decisionifUserIsInAudience.reasons);
    if (!decisionifUserIsInAudience.result) {
      this.logger?.info(
        USER_NOT_IN_EXPERIMENT,
        userId,
        experimentKey,
      );
      decideReasons.push([
        USER_NOT_IN_EXPERIMENT,
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
      this.logger?.debug(
        USER_HAS_NO_VARIATION,
        userId,
        experimentKey,
      );
      decideReasons.push([
        USER_HAS_NO_VARIATION,
        userId,
        experimentKey,
      ]);
      return {
        result: null,
        reasons: decideReasons,
      };
    }

    this.logger?.info(
      USER_HAS_VARIATION,
      userId,
      variation.key,
      experimentKey,
    );
    decideReasons.push([
      USER_HAS_VARIATION,
      userId,
      variation.key,
      experimentKey,
    ]);
    // persist bucketing if decide options do not include shouldIgnoreUPS
    if (!shouldIgnoreUPS) {
      this.updateUserProfile(experiment, variation, userProfileTracker);
    }

    return {
      result: variation.key,
      reasons: decideReasons,
    };
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
    const shouldIgnoreUPS = options[OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE];
    const userProfileTracker: UserProfileTracker = {
      isProfileUpdated: false,
      userProfile: null,
    }
    if(!shouldIgnoreUPS) {
      userProfileTracker.userProfile = this.resolveExperimentBucketMap(user.getUserId(), user.getAttributes());
    }

    const result = this.resolveVariation(configObj, experiment, user, shouldIgnoreUPS, userProfileTracker);

    if(!shouldIgnoreUPS) {
      this.saveUserProfile(user.getUserId(), userProfileTracker)
    }

    return result
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
    return { ...userProfile.experiment_bucket_map, ...attributeExperimentBucketMap as any };
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
        this.logger?.info(
          USER_FORCED_IN_VARIATION,
          userId,
          forcedVariationKey,
        );
        decideReasons.push([
          USER_FORCED_IN_VARIATION,
          userId,
          forcedVariationKey,
        ]);
        return {
          result: experiment.variationKeyMap[forcedVariationKey],
          reasons: decideReasons,
        };
      } else {
        this.logger?.error(
          FORCED_BUCKETING_FAILED,
          forcedVariationKey,
          userId,
        );
        decideReasons.push([
          FORCED_BUCKETING_FAILED,
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
    user: OptimizelyUserContext,
    loggingKey?: string | number,
  ): DecisionResponse<boolean> {
    const decideReasons: (string | number)[][] = [];
    const experimentAudienceConditions = getExperimentAudienceConditions(configObj, experiment.id);
    const audiencesById = getAudiencesById(configObj);
    this.logger?.debug(
      EVALUATING_AUDIENCES_COMBINED,
      evaluationAttribute,
      loggingKey || experiment.key,
      JSON.stringify(experimentAudienceConditions),
    );
    decideReasons.push([
      EVALUATING_AUDIENCES_COMBINED,
      evaluationAttribute,
      loggingKey || experiment.key,
      JSON.stringify(experimentAudienceConditions),
    ]);
    const result = this.audienceEvaluator.evaluate(experimentAudienceConditions, audiencesById, user);
    this.logger?.info(
      AUDIENCE_EVALUATION_RESULT_COMBINED,
      evaluationAttribute,
      loggingKey || experiment.key,
      result.toString().toUpperCase(),
    );
    decideReasons.push([
      AUDIENCE_EVALUATION_RESULT_COMBINED,
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
    experimentBucketMap: ExperimentBucketMap | null
  ): Variation | null {
    if (experimentBucketMap?.hasOwnProperty(experiment.id)) {
      const decision = experimentBucketMap[experiment.id];
      const variationId = decision.variation_id;
      if (configObj.variationIdMap.hasOwnProperty(variationId)) {
        return configObj.variationIdMap[decision.variation_id];
      } else {
        this.logger?.info(
          SAVED_VARIATION_NOT_FOUND,
          userId,
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
    } catch (ex: any) {
      this.logger?.error(
        USER_PROFILE_LOOKUP_ERROR,
        userId,
        ex.message,
      );
    }

    return null;
  }

  private updateUserProfile(
    experiment: Experiment,
    variation: Variation,
    userProfileTracker: UserProfileTracker
  ): void {
    if(!userProfileTracker.userProfile) {
      return
    }

    userProfileTracker.userProfile[experiment.id] = {
      variation_id: variation.id
    }
    userProfileTracker.isProfileUpdated = true
  }

  /**
   * Saves the bucketing decision to the user profile
   * @param {Experiment}          experiment
   * @param {Variation}           variation
   * @param {string}              userId
   * @param {ExperimentBucketMap} experimentBucketMap
   */
  private saveUserProfile(
    userId: string,
    userProfileTracker: UserProfileTracker
  ): void {
    const { userProfile, isProfileUpdated } = userProfileTracker;

    if (!this.userProfileService || !userProfile || !isProfileUpdated) {
      return;
    }

    try {
      this.userProfileService.save({
        user_id: userId,
        experiment_bucket_map: userProfile,
      });

      this.logger?.info(
        SAVED_USER_VARIATION,
        userId,
      );
    } catch (ex: any) {
      this.logger?.error(USER_PROFILE_SAVE_ERROR, userId, ex.message);
    }
  }

  /**
   * Determines variations for the specified feature flags.
   *
   * @param {ProjectConfig} configObj - The parsed project configuration object.
   * @param {FeatureFlag[]} featureFlags - The feature flags for which variations are to be determined.
   * @param {OptimizelyUserContext} user - The user context associated with this decision.
   * @param {Record<string, boolean>} options - An optional map of decision options.
   * @returns {DecisionResponse<DecisionObj>[]} - An array of DecisionResponse containing objects with
   *                                               experiment, variation, decisionSource properties, and decision reasons.
   */
  getVariationsForFeatureList(configObj: ProjectConfig,
    featureFlags: FeatureFlag[],
    user: OptimizelyUserContext,
    options: { [key: string]: boolean } = {}): DecisionResponse<DecisionObj>[] {
    const userId = user.getUserId();
    const attributes = user.getAttributes();
    const decisions: DecisionResponse<DecisionObj>[] = [];
    const userProfileTracker : UserProfileTracker = {
      isProfileUpdated: false,
      userProfile: null,
    }
    const shouldIgnoreUPS = options[OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE];

    if(!shouldIgnoreUPS) {
      userProfileTracker.userProfile = this.resolveExperimentBucketMap(userId, attributes);
    }

    for(const feature of featureFlags) {
      const decideReasons: (string | number)[][] = [];
      const decisionVariation = this.getVariationForFeatureExperiment(configObj, feature, user, shouldIgnoreUPS, userProfileTracker);
      decideReasons.push(...decisionVariation.reasons);
      const experimentDecision = decisionVariation.result;

      if (experimentDecision.variation !== null) {
        decisions.push({
          result: experimentDecision,
          reasons: decideReasons,
        });
        continue;
      }

      const decisionRolloutVariation = this.getVariationForRollout(configObj, feature, user);
      decideReasons.push(...decisionRolloutVariation.reasons);
      const rolloutDecision = decisionRolloutVariation.result;
      const userId = user.getUserId();

      if (rolloutDecision.variation) {
        this.logger?.debug(USER_IN_ROLLOUT, userId, feature.key);
        decideReasons.push([USER_IN_ROLLOUT, userId, feature.key]);
      } else {
        this.logger?.debug(USER_NOT_IN_ROLLOUT, userId, feature.key);
        decideReasons.push([USER_NOT_IN_ROLLOUT, userId, feature.key]);
      }

      decisions.push({
        result: rolloutDecision,
        reasons: decideReasons,
      });
    }

    if(!shouldIgnoreUPS) {
      this.saveUserProfile(userId, userProfileTracker)
    }

    return decisions
    
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
    return this.getVariationsForFeatureList(configObj, [feature], user, options)[0]
  }

  private getVariationForFeatureExperiment(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    user: OptimizelyUserContext,
    shouldIgnoreUPS: boolean,
    userProfileTracker: UserProfileTracker 
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
          decisionVariation = this.getVariationFromExperimentRule(configObj, feature.key, experiment, user, shouldIgnoreUPS, userProfileTracker);
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
      this.logger?.debug(FEATURE_HAS_NO_EXPERIMENTS, feature.key);
      decideReasons.push([FEATURE_HAS_NO_EXPERIMENTS, feature.key]);
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
      this.logger?.debug(NO_ROLLOUT_EXISTS, feature.key);
      decideReasons.push([NO_ROLLOUT_EXISTS, feature.key]);
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
      this.logger?.error(
        INVALID_ROLLOUT_ID,
        feature.rolloutId,
        feature.key,
      );
      decideReasons.push([INVALID_ROLLOUT_ID, feature.rolloutId, feature.key]);
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
      this.logger?.error(
        ROLLOUT_HAS_NO_EXPERIMENTS,
        feature.rolloutId,
      );
      decideReasons.push([ROLLOUT_HAS_NO_EXPERIMENTS, feature.rolloutId]);
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
        bucketingId = String(attributes[CONTROL_ATTRIBUTES.BUCKETING_ID]);
        this.logger?.debug(VALID_BUCKETING_ID, bucketingId);
      } else {
        this.logger?.warn(BUCKETING_ID_NOT_STRING);
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
          this.logger?.info(
            USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
            variationKey,
            flagKey,
            ruleKey,
            userId
          );
          decideReasons.push([
            USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
            variationKey,
            flagKey,
            ruleKey,
            userId
          ]);
        } else {
          this.logger?.info(
            USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
            variationKey,
            flagKey,
            userId
          );
          decideReasons.push([
            USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
            variationKey,
            flagKey,
            userId
          ])
        }
      } else {
        if (ruleKey) {
          this.logger?.info(
            USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
            flagKey,
            ruleKey,
            userId
          );
          decideReasons.push([
            USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
            flagKey,
            ruleKey,
            userId
          ]);
        } else {
          this.logger?.info(
            USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
            flagKey,
            userId
          );
          decideReasons.push([
            USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
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
      throw new OptimizelyError(INVALID_USER_ID);
    }

    if (this.forcedVariationMap.hasOwnProperty(userId)) {
      delete this.forcedVariationMap[userId][experimentId];
      this.logger?.debug(
        VARIATION_REMOVED_FOR_USER,
        experimentKey,
        userId,
      );
    } else {
      throw new OptimizelyError(USER_NOT_IN_FORCED_VARIATION, userId);
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

    this.logger?.debug(
      USER_MAPPED_TO_FORCED_VARIATION,
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
      this.logger?.debug(
        USER_HAS_NO_FORCED_VARIATION,
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
        this.logger?.error(
          IMPROPERLY_FORMATTED_EXPERIMENT,
          experimentKey,
        );
        decideReasons.push([
          IMPROPERLY_FORMATTED_EXPERIMENT,
          experimentKey,
        ]);

        return {
          result: null,
          reasons: decideReasons,
        };
      }
    } catch (ex: any) {
      // catching experiment not in datafile
      this.logger?.error(ex);
      decideReasons.push(ex.message);

      return {
        result: null,
        reasons: decideReasons,
      };
    }

    const variationId = experimentToVariationMap[experimentId];
    if (!variationId) {
      this.logger?.debug(
        USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
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
      this.logger?.debug(
        USER_HAS_FORCED_VARIATION,
        variationKey,
        experimentKey,
        userId,
      );
      decideReasons.push([
        USER_HAS_FORCED_VARIATION,
        variationKey,
        experimentKey,
        userId,
      ]);
    } else {
      this.logger?.debug(
        USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
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
      this.logger?.error(INVALID_VARIATION_KEY);
      return false;
    }

    let experimentId;
    try {
      const experiment = getExperimentFromKey(configObj, experimentKey);
      if (experiment.hasOwnProperty('id')) {
        experimentId = experiment['id'];
      } else {
        // catching improperly formatted experiments
        this.logger?.error(
          IMPROPERLY_FORMATTED_EXPERIMENT,
          experimentKey,
        );
        return false;
      }
    } catch (ex: any) {
      // catching experiment not in datafile
      this.logger?.error(ex);
      return false;
    }

    if (variationKey == null) {
      try {
        this.removeForcedVariation(userId, experimentId, experimentKey);
        return true;
      } catch (ex: any) {
        this.logger?.error(ex);
        return false;
      }
    }

    const variationId = getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);

    if (!variationId) {
      this.logger?.error(
        NO_VARIATION_FOR_EXPERIMENT_KEY,
        variationKey,
        experimentKey,
      );
      return false;
    }

    try {
      this.setInForcedVariationMap(userId, experimentId, variationId);
      return true;
    } catch (ex: any) {
      this.logger?.error(ex);
      return false;
    }
  }

  getVariationFromExperimentRule(
    configObj: ProjectConfig,
    flagKey: string,
    rule: Experiment,
    user: OptimizelyUserContext,
    shouldIgnoreUPS: boolean,
    userProfileTracker: UserProfileTracker
  ): DecisionResponse<string | null> {
    const decideReasons: (string | number)[][] = [];

    // check forced decision first
    const forcedDecisionResponse = this.findValidatedForcedDecision(configObj, user, flagKey, rule.key);
    decideReasons.push(...forcedDecisionResponse.reasons);

    const forcedVariation = forcedDecisionResponse.result;
    if (forcedVariation) {
      return {
        result: forcedVariation.key,
        reasons: decideReasons,
      };
    }
    const decisionVariation = this.resolveVariation(configObj, rule, user, shouldIgnoreUPS, userProfileTracker);
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

    const forcedVariation = forcedDecisionResponse.result;
    if (forcedVariation) {
      return {
        result: forcedVariation,
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
      user,
      loggingKey
    );
    decideReasons.push(...decisionifUserIsInAudience.reasons);
    if (decisionifUserIsInAudience.result) {
      this.logger?.debug(
        USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
        userId,
        loggingKey
      );
      decideReasons.push([
        USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
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
        this.logger?.debug(
          USER_BUCKETED_INTO_TARGETING_RULE,
          userId,
          loggingKey
        );
        decideReasons.push([
          USER_BUCKETED_INTO_TARGETING_RULE,
          userId,
          loggingKey]);
      } else if (!everyoneElse) {
        // skip this logging for EveryoneElse since this has a message not for EveryoneElse
        this.logger?.debug(
          USER_NOT_BUCKETED_INTO_TARGETING_RULE,
          userId,
          loggingKey
        );
        decideReasons.push([
          USER_NOT_BUCKETED_INTO_TARGETING_RULE,
          userId,
          loggingKey
        ]);

        // skip the rest of rollout rules to the everyone-else rule if audience matches but not bucketed
        skipToEveryoneElse = true;
      }
    } else {
      this.logger?.debug(
        USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
        userId,
        loggingKey
      );
      decideReasons.push([
        USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
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
