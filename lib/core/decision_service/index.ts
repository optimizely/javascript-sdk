/**
 * Copyright 2017-2022, 2024-2025, Optimizely
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
  DecisionSource,
} from '../../utils/enums';
import {
  getAudiencesById,
  getExperimentFromId,
  getExperimentFromKey,
  getFlagVariationByKey,
  getVariationIdFromExperimentAndVariationKey,
  getVariationFromId,
  getVariationKeyFromId,
  isActive,
  ProjectConfig,
  getHoldoutsForFlag,
} from '../../project_config/project_config';
import { AudienceEvaluator, createAudienceEvaluator } from '../audience_evaluator';
import * as stringValidator from '../../utils/string_value_validator';
import {
  BucketerParams,
  DecisionResponse,
  Experiment,
  ExperimentBucketMap,
  ExperimentCore,
  FeatureFlag,
  Holdout,
  OptimizelyDecideOption,
  OptimizelyUserContext,
  UserAttributes,
  UserProfile,
  UserProfileService,
  UserProfileServiceAsync,
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
  USER_HAS_NO_FORCED_VARIATION,
  USER_MAPPED_TO_FORCED_VARIATION,
  USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
  VALID_BUCKETING_ID,
  VARIATION_REMOVED_FOR_USER,
} from 'log_message';
import { OptimizelyError } from '../../error/optimizly_error';
import { CmabService } from './cmab/cmab_service';
import { Maybe, OpType, OpValue } from '../../utils/type';
import { Value } from '../../utils/promise/operation_value';
import * as featureToggle from '../../feature_toggle';

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
export const USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED =
  'Variation (%s) is mapped to flag (%s), rule (%s) and user (%s) in the forced decision map.';
export const USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED =
  'Variation (%s) is mapped to flag (%s) and user (%s) in the forced decision map.';
export const USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID =
  'Invalid variation is mapped to flag (%s), rule (%s) and user (%s) in the forced decision map.';
export const USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID =
  'Invalid variation is mapped to flag (%s) and user (%s) in the forced decision map.';
export const CMAB_NOT_SUPPORTED_IN_SYNC = 'CMAB is not supported in sync mode.';
export const CMAB_FETCH_FAILED = 'Failed to fetch CMAB data for experiment %s.';
export const CMAB_FETCHED_VARIATION_INVALID = 'Fetched variation %s for cmab experiment %s is invalid.';
export const HOLDOUT_NOT_RUNNING = 'Holdout %s is not running.';
export const USER_MEETS_CONDITIONS_FOR_HOLDOUT = 'User %s meets conditions for holdout %s.';
export const USER_DOESNT_MEET_CONDITIONS_FOR_HOLDOUT = 'User %s does not meet conditions for holdout %s.';
export const USER_BUCKETED_INTO_HOLDOUT_VARIATION = 'User %s is in variation %s of holdout %s.';
export const USER_NOT_BUCKETED_INTO_HOLDOUT_VARIATION = 'User %s is in no holdout variation.';

export interface DecisionObj {
  experiment: Experiment | Holdout | null;
  variation: Variation | null;
  decisionSource: DecisionSource;
  cmabUuid?: string;
}

interface DecisionServiceOptions {
  userProfileService?: UserProfileService;
  userProfileServiceAsync?: UserProfileServiceAsync;
  logger?: LoggerFacade;
  UNSTABLE_conditionEvaluators: unknown;
  cmabService: CmabService;
}

interface DeliveryRuleResponse<T, K> extends DecisionResponse<T> {
  skipToEveryoneElse: K;
}

interface UserProfileTracker {
  userProfile: ExperimentBucketMap | null;
  isProfileUpdated: boolean;
}

type VarationKeyWithCmabParams = {
  variationKey?: string;
  cmabUuid?: string;
};
export type DecisionReason = [string, ...any[]];
export type VariationResult = DecisionResponse<VarationKeyWithCmabParams>;
export type DecisionResult = DecisionResponse<DecisionObj>;
type VariationIdWithCmabParams = {
  variationId? : string;
  cmabUuid?: string;
};
export type DecideOptionsMap = Partial<Record<OptimizelyDecideOption, boolean>>;

export const CMAB_DUMMY_ENTITY_ID= '$'

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
  private userProfileService?: UserProfileService;
  private userProfileServiceAsync?: UserProfileServiceAsync;
  private cmabService: CmabService;

  constructor(options: DecisionServiceOptions) {
    this.logger = options.logger;
    this.audienceEvaluator = createAudienceEvaluator(options.UNSTABLE_conditionEvaluators, this.logger);
    this.forcedVariationMap = {};
    this.userProfileService = options.userProfileService;
    this.userProfileServiceAsync = options.userProfileServiceAsync;
    this.cmabService = options.cmabService;
  }
 
  private isCmab(experiment: Experiment): boolean {
    return !!experiment.cmab;
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
  private resolveVariation<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    experiment: Experiment,
    user: OptimizelyUserContext,
    decideOptions: DecideOptionsMap,
    userProfileTracker?: UserProfileTracker,
  ): Value<OP, VariationResult> { 
    const userId = user.getUserId();

    const experimentKey = experiment.key;

    if (!isActive(configObj, experimentKey)) {
      this.logger?.info(EXPERIMENT_NOT_RUNNING, experimentKey);
      return Value.of(op, {
        result: {},
        reasons: [[EXPERIMENT_NOT_RUNNING, experimentKey]],
      });
    }

    const decideReasons: DecisionReason[] = [];

    const decisionForcedVariation = this.getForcedVariation(configObj, experimentKey, userId);
    decideReasons.push(...decisionForcedVariation.reasons);
    const forcedVariationKey = decisionForcedVariation.result;

    if (forcedVariationKey) {
      return Value.of(op, {
        result: { variationKey: forcedVariationKey },
        reasons: decideReasons,
      });
    }

    const decisionWhitelistedVariation = this.getWhitelistedVariation(experiment, userId);
    decideReasons.push(...decisionWhitelistedVariation.reasons);
    let variation = decisionWhitelistedVariation.result;
    if (variation) {
      return Value.of(op, {
        result: { variationKey: variation.key },
        reasons: decideReasons,
      });
    }

    // check for sticky bucketing
    if (userProfileTracker) {
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
        return Value.of(op, {
          result: { variationKey: variation.key },
          reasons: decideReasons,
        });
      }
    }

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
      return Value.of(op, {
        result: {},
        reasons: decideReasons,
      });
    }

    const decisionVariationValue = this.isCmab(experiment) ?
      this.getDecisionForCmabExperiment(op, configObj, experiment, user, decideOptions) :
      this.getDecisionFromBucketer(op, configObj, experiment, user);

    return decisionVariationValue.then((variationResult): Value<OP, VariationResult> => {
      decideReasons.push(...variationResult.reasons);
      if (variationResult.error) {
        return Value.of(op, {
          error: true,
          result: {},
          reasons: decideReasons,
        });
      }
      
      const variationId = variationResult.result.variationId;
      variation = variationId ? configObj.variationIdMap[variationId] : null;
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
        return Value.of(op, {
          result: {},
          reasons: decideReasons,
        });
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

      // store the bucketing decision in user profile
      // cmab experiments will be excluded
      if (userProfileTracker && !this.isCmab(experiment)) {
        this.updateUserProfile(experiment, variation, userProfileTracker);
      }
      
      return Value.of(op, {
        result: { variationKey: variation.key, cmabUuid: variationResult.result.cmabUuid },
        reasons: decideReasons,
      });
    });
  }

  private getDecisionForCmabExperiment<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    experiment: Experiment,
    user: OptimizelyUserContext,
    decideOptions: DecideOptionsMap,
  ): Value<OP, DecisionResponse<VariationIdWithCmabParams>> {
    if (op === 'sync') {
      return Value.of(op, {
        error: false, // this is not considered an error, the evaluation should continue to next rule
        result: {},
        reasons: [[CMAB_NOT_SUPPORTED_IN_SYNC]],
      });
    }

    const userId = user.getUserId();
    const attributes = user.getAttributes();

    const bucketingId = this.getBucketingId(userId, attributes);
    const bucketerParams = this.buildBucketerParams(configObj, experiment, bucketingId, userId);

    const bucketerResult = bucket(bucketerParams);

    // this means the user is not in the cmab experiment
    if (bucketerResult.result !== CMAB_DUMMY_ENTITY_ID) {
      return Value.of(op, {
        error: false,
        result: {},
        reasons: bucketerResult.reasons,
      });
    }
    
    const cmabPromise = this.cmabService.getDecision(configObj, user, experiment.id, decideOptions).then(
      (cmabDecision) => {
        return {
          error: false,
          result: cmabDecision,
          reasons: [] as DecisionReason[],
        };
      }
    ).catch((ex: any) => {
      this.logger?.error(CMAB_FETCH_FAILED, experiment.key);
      return {
        error: true,
        result: {},
        reasons: [[CMAB_FETCH_FAILED, experiment.key]] as DecisionReason[],
      };
    });

    return Value.of(op, cmabPromise);
  }

  private getDecisionFromBucketer<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    experiment: Experiment,
    user: OptimizelyUserContext
  ): Value<OP, DecisionResponse<VariationIdWithCmabParams>> {
    const userId = user.getUserId();
    const attributes = user.getAttributes();

    // by default, the bucketing ID should be the user ID
    const bucketingId = this.getBucketingId(userId, attributes);
    const bucketerParams = this.buildBucketerParams(configObj, experiment, bucketingId, userId);

    const decisionVariation = bucket(bucketerParams);
    return Value.of(op, {
      result: { 
        variationId: decisionVariation.result || undefined,
      },
      reasons: decisionVariation.reasons,
    });
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
    options: DecideOptionsMap = {}
  ): DecisionResponse<string | null> {
    const shouldIgnoreUPS = options[OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE];
    const userProfileTracker: Maybe<UserProfileTracker> = shouldIgnoreUPS ? undefined
      : {
        isProfileUpdated: false,
        userProfile: this.resolveExperimentBucketMap('sync', user.getUserId(), user.getAttributes()).get(),
      };

    const result = this.resolveVariation('sync', configObj, experiment, user, options, userProfileTracker).get();

    if(userProfileTracker) {
      this.saveUserProfile('sync', user.getUserId(), userProfileTracker)
    }

    return {
      result: result.result.variationKey || null,
      reasons: result.reasons,
    }
  }

  /**
   * Merges attributes from attributes[STICKY_BUCKETING_KEY] and userProfileService
   * @param  {string}               userId
   * @param  {UserAttributes}       attributes
   * @return {ExperimentBucketMap}  finalized copy of experiment_bucket_map
   */
  private resolveExperimentBucketMap<OP extends OpType>(
    op: OP,
    userId: string,
    attributes: UserAttributes = {},
  ): Value<OP, ExperimentBucketMap> {
    const fromAttributes = (attributes[CONTROL_ATTRIBUTES.STICKY_BUCKETING_KEY] || {}) as any as ExperimentBucketMap;
    return this.getUserProfile(op, userId).then((userProfile) => {
      const fromUserProfileService = userProfile?.experiment_bucket_map || {};
      return Value.of(op, {
        ...fromUserProfileService,
        ...fromAttributes,
      });
    });
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
    const decideReasons: DecisionReason[] = [];
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
    experiment: ExperimentCore,
    evaluationAttribute: string,
    user: OptimizelyUserContext,
    loggingKey?: string | number,
  ): DecisionResponse<boolean> {
    const decideReasons: DecisionReason[] = [];
    const experimentAudienceConditions = experiment.audienceConditions || experiment.audienceIds;
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
    experiment: Experiment | Holdout,
    bucketingId: string,
    userId: string
  ): BucketerParams {
    let validateEntity = true;

    let trafficAllocationConfig = experiment.trafficAllocation;

    if ('cmab' in experiment && experiment.cmab) {
      trafficAllocationConfig = [{
        entityId: CMAB_DUMMY_ENTITY_ID,
        endOfRange: experiment.cmab.trafficAllocation
      }];

      validateEntity = false;
    }

    return {
      bucketingId,
      experimentId: experiment.id,
      experimentKey: experiment.key,
      experimentIdMap: configObj.experimentIdMap,
      experimentKeyMap: configObj.experimentKeyMap,
      groupIdMap: configObj.groupIdMap,
      logger: this.logger,
      trafficAllocationConfig,
      userId,
      variationIdMap: configObj.variationIdMap,
      validateEntity,
    }
  }

  /**
   * Determines if a user should be bucketed into a holdout variation.
   * @param {ProjectConfig} configObj - The parsed project configuration object.
   * @param {Holdout} holdout - The holdout to evaluate.
   * @param {OptimizelyUserContext} user - The user context.
   * @returns {DecisionResponse<DecisionObj>} - DecisionResponse containing holdout decision and reasons.
   */
  private getVariationForHoldout(
    configObj: ProjectConfig,
    holdout: Holdout,
    user: OptimizelyUserContext,
  ): DecisionResponse<DecisionObj> {
    const userId = user.getUserId();
    const decideReasons: DecisionReason[] = [];

    if (holdout.status !== 'Running') {
      const reason: DecisionReason = [HOLDOUT_NOT_RUNNING, holdout.key];
      decideReasons.push(reason);
      this.logger?.info(HOLDOUT_NOT_RUNNING, holdout.key);
      return {
        result: { 
          experiment: null, 
          variation: null, 
          decisionSource: DECISION_SOURCES.HOLDOUT 
        },
        reasons: decideReasons
      };
    }

    const audienceResult = this.checkIfUserIsInAudience(
      configObj, 
      holdout, 
      AUDIENCE_EVALUATION_TYPES.EXPERIMENT, 
      user
    );
    decideReasons.push(...audienceResult.reasons);

    if (!audienceResult.result) {
      const reason: DecisionReason = [USER_DOESNT_MEET_CONDITIONS_FOR_HOLDOUT, userId, holdout.key];
      decideReasons.push(reason);
      this.logger?.info(USER_DOESNT_MEET_CONDITIONS_FOR_HOLDOUT, userId, holdout.key);
      return {
        result: { 
          experiment: null, 
          variation: null, 
          decisionSource: DECISION_SOURCES.HOLDOUT 
        },
        reasons: decideReasons
      };
    }

    const reason: DecisionReason = [USER_MEETS_CONDITIONS_FOR_HOLDOUT, userId, holdout.key];
    decideReasons.push(reason);
    this.logger?.info(USER_MEETS_CONDITIONS_FOR_HOLDOUT, userId, holdout.key);

    const attributes = user.getAttributes();
    const bucketingId = this.getBucketingId(userId, attributes);
    const bucketerParams = this.buildBucketerParams(configObj, holdout, bucketingId, userId);
    const bucketResult = bucket(bucketerParams);

    decideReasons.push(...bucketResult.reasons);

    if (bucketResult.result) {
      const variation = configObj.variationIdMap[bucketResult.result];
      if (variation) {
        const bucketReason: DecisionReason = [USER_BUCKETED_INTO_HOLDOUT_VARIATION, userId, holdout.key, variation.key];
        decideReasons.push(bucketReason);
        this.logger?.info(USER_BUCKETED_INTO_HOLDOUT_VARIATION, userId, holdout.key, variation.key);

        return {
          result: {
            experiment: holdout,
            variation: variation,
            decisionSource: DECISION_SOURCES.HOLDOUT
          },
          reasons: decideReasons
        };
      }
    }

    const noBucketReason: DecisionReason = [USER_NOT_BUCKETED_INTO_HOLDOUT_VARIATION, userId];
    decideReasons.push(noBucketReason);
    this.logger?.info(USER_NOT_BUCKETED_INTO_HOLDOUT_VARIATION, userId);
    return {
      result: { 
        experiment: null, 
        variation: null, 
        decisionSource: DECISION_SOURCES.HOLDOUT 
      },
      reasons: decideReasons
    };
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
   * @return {UserProfile} the stored user profile or an empty profile if one isn't found or error
   */
  private getUserProfile<OP extends OpType>(op: OP, userId: string): Value<OP, UserProfile> {
    const emptyProfile = {
      user_id: userId,
      experiment_bucket_map: {},
    };

    if (this.userProfileService) {
      try {
        return Value.of(op, this.userProfileService.lookup(userId));
      } catch (ex: any) {
        this.logger?.error(
          USER_PROFILE_LOOKUP_ERROR,
          userId,
          ex.message,
        );
      }
      return Value.of(op, emptyProfile);
    }

    if (this.userProfileServiceAsync && op === 'async') {
      return Value.of(op, this.userProfileServiceAsync.lookup(userId).catch((ex: any) => {
        this.logger?.error(
          USER_PROFILE_LOOKUP_ERROR,
          userId,
          ex.message,
        );
        return emptyProfile;
      }));
    }

    return Value.of(op, emptyProfile);
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
  private saveUserProfile<OP extends OpType>(
    op: OP,
    userId: string,
    userProfileTracker: UserProfileTracker
  ): Value<OP, unknown> {
    const { userProfile, isProfileUpdated } = userProfileTracker;

    if (!userProfile || !isProfileUpdated) {
      return Value.of(op, undefined);
    }

    if (op === 'sync' && !this.userProfileService) {
      return Value.of(op, undefined);
    }

    if (this.userProfileService) {
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
      return Value.of(op, undefined);
    }

    if (this.userProfileServiceAsync) {
      return Value.of(op, this.userProfileServiceAsync.save({
        user_id: userId,
        experiment_bucket_map: userProfile,
      }).catch((ex: any) => {
        this.logger?.error(USER_PROFILE_SAVE_ERROR, userId, ex.message);
      }));
    }

    return Value.of(op, undefined);
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
  getVariationsForFeatureList(
    configObj: ProjectConfig,
    featureFlags: FeatureFlag[],
    user: OptimizelyUserContext,
    options: DecideOptionsMap = {}): DecisionResult[] {
      return this.resolveVariationsForFeatureList('sync', configObj, featureFlags, user, options).get();
  }

  resolveVariationsForFeatureList<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    featureFlags: FeatureFlag[],
    user: OptimizelyUserContext,
    options: DecideOptionsMap): Value<OP, DecisionResult[]> {
    const userId = user.getUserId();
    const attributes = user.getAttributes();
    const decisions: DecisionResponse<DecisionObj>[] = [];
    // const userProfileTracker : UserProfileTracker = {
    //   isProfileUpdated: false,
    //   userProfile: null,
    // }
    const shouldIgnoreUPS = !!options[OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE];

    const userProfileTrackerValue: Value<OP, Maybe<UserProfileTracker>> = shouldIgnoreUPS ? Value.of(op, undefined)
      : this.resolveExperimentBucketMap(op, userId, attributes).then((userProfile) => {
        return Value.of(op, {
          isProfileUpdated: false,
          userProfile: userProfile,
        });
      });

    return userProfileTrackerValue.then((userProfileTracker) => {
      const flagResults = featureFlags.map((feature) => this.resolveVariationForFlag(op, configObj, feature, user, options, userProfileTracker));
      const opFlagResults = Value.all(op, flagResults);

      return opFlagResults.then(() => {
        if(userProfileTracker) {
          this.saveUserProfile(op, userId, userProfileTracker);
        }
        return opFlagResults;
      });
    });
  }

  private resolveVariationForFlag<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    feature: FeatureFlag,
    user: OptimizelyUserContext,
    decideOptions: DecideOptionsMap,
    userProfileTracker?: UserProfileTracker
  ): Value<OP, DecisionResult> {
    const decideReasons: DecisionReason[] = [];

    const forcedDecisionResponse = this.findValidatedForcedDecision(configObj, user, feature.key);
    decideReasons.push(...forcedDecisionResponse.reasons);

    if (forcedDecisionResponse.result) {
      return Value.of(op, {
        result: {
          variation: forcedDecisionResponse.result,
          experiment: null,
          decisionSource: DECISION_SOURCES.FEATURE_TEST,
        },
        reasons: decideReasons,
      });
    }
    if (featureToggle.holdout()) {
      const holdouts = getHoldoutsForFlag(configObj, feature.key);

      for (const holdout of holdouts) {
        const holdoutDecision = this.getVariationForHoldout(configObj, holdout, user);
        decideReasons.push(...holdoutDecision.reasons);

        if (holdoutDecision.result.variation) {
          return Value.of(op, {
            result: holdoutDecision.result,
            reasons: decideReasons,
          });
        }
      }
    }

    return this.getVariationForFeatureExperiment(op, configObj, feature, user, decideOptions, userProfileTracker).then((experimentDecision) => {
      if (experimentDecision.error || experimentDecision.result.variation !== null) {
        return Value.of(op, {
          ...experimentDecision,
          reasons: [...decideReasons, ...experimentDecision.reasons],
        });
      }

      decideReasons.push(...experimentDecision.reasons);
      
      const rolloutDecision = this.getVariationForRollout(configObj, feature, user);
      decideReasons.push(...rolloutDecision.reasons);
      const rolloutDecisionResult = rolloutDecision.result;
      const userId = user.getUserId();
  
      if (rolloutDecisionResult.variation) {
        this.logger?.debug(USER_IN_ROLLOUT, userId, feature.key);
        decideReasons.push([USER_IN_ROLLOUT, userId, feature.key]);
      } else {
        this.logger?.debug(USER_NOT_IN_ROLLOUT, userId, feature.key);
        decideReasons.push([USER_NOT_IN_ROLLOUT, userId, feature.key]);
      }
  
      return Value.of(op, {
        result: rolloutDecisionResult,
        reasons: decideReasons,
      });
    });
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
    options: DecideOptionsMap = {}
  ): DecisionResponse<DecisionObj> {
    return this.resolveVariationsForFeatureList('sync', configObj, [feature], user, options).get()[0]
  }

  private getVariationForFeatureExperiment<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    feature: FeatureFlag,
    user: OptimizelyUserContext,
    decideOptions: DecideOptionsMap,
    userProfileTracker?: UserProfileTracker,
  ): Value<OP, DecisionResult> {

    // const decideReasons: DecisionReason[] = [];
    // let variationKey = null;
    // let decisionVariation;
    // let index;
    // let variationForFeatureExperiment;

    if (feature.experimentIds.length === 0) {
      this.logger?.debug(FEATURE_HAS_NO_EXPERIMENTS, feature.key);
      return Value.of(op, {
        result: {
          experiment: null,
          variation: null,
          decisionSource: DECISION_SOURCES.FEATURE_TEST,
        },
        reasons: [
          [FEATURE_HAS_NO_EXPERIMENTS, feature.key],
        ],
      }); 
    }
    
    return this.traverseFeatureExperimentList(op, configObj, feature, 0, user, [], decideOptions, userProfileTracker);
  }

  private traverseFeatureExperimentList<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    feature: FeatureFlag,
    fromIndex: number,
    user: OptimizelyUserContext,
    decideReasons: DecisionReason[],
    decideOptions: DecideOptionsMap,
    userProfileTracker?: UserProfileTracker,
  ): Value<OP, DecisionResult> {
    const experimentIds = feature.experimentIds;
    if (fromIndex >= experimentIds.length) {
      return Value.of(op, {
        result: {
          experiment: null,
          variation: null,
          decisionSource: DECISION_SOURCES.FEATURE_TEST,
        },
        reasons: decideReasons,
      });
    }

    const experiment = getExperimentFromId(configObj, experimentIds[fromIndex], this.logger);
    if (!experiment) {
      return this.traverseFeatureExperimentList(
        op, configObj, feature, fromIndex + 1, user, decideReasons, decideOptions, userProfileTracker);
    }

    const decisionVariationValue = this.getVariationFromExperimentRule(
      op, configObj, feature.key, experiment, user, decideOptions, userProfileTracker,
    );

    return decisionVariationValue.then((decisionVariation) => {
      decideReasons.push(...decisionVariation.reasons);

      if (decisionVariation.error) {
        return Value.of(op, {
          error: true,
          result: {
            experiment,
            variation: null,
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          },
          reasons: decideReasons,
        });
      }

      if(!decisionVariation.result.variationKey) {
        return this.traverseFeatureExperimentList(
          op, configObj, feature, fromIndex + 1, user, decideReasons, decideOptions, userProfileTracker);
      }
  
      const variationKey = decisionVariation.result.variationKey;
      let variation: Variation | null = experiment.variationKeyMap[variationKey];
      if (!variation) {
        variation = getFlagVariationByKey(configObj, feature.key, variationKey);
      }

      return Value.of(op, {
        result: {
          cmabUuid: decisionVariation.result.cmabUuid,
          experiment,
          variation,
          decisionSource: DECISION_SOURCES.FEATURE_TEST,
        },
        reasons: decideReasons,
      });
    });
  }

  private getVariationForRollout(
    configObj: ProjectConfig,
    feature: FeatureFlag,
    user: OptimizelyUserContext,
  ): DecisionResponse<DecisionObj> {
    const decideReasons: DecisionReason[] = [];
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

    const decideReasons: DecisionReason[] = [];
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
  private removeForcedVariation(userId: string, experimentId: string, experimentKey: string): void {
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
    const decideReasons: DecisionReason[] = [];
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

  private getVariationFromExperimentRule<OP extends OpType>(
    op: OP,
    configObj: ProjectConfig,
    flagKey: string,
    rule: Experiment,
    user: OptimizelyUserContext,
    decideOptions: DecideOptionsMap,
    userProfileTracker?: UserProfileTracker,
  ): Value<OP, VariationResult> {
    const decideReasons: DecisionReason[] = [];

    // check forced decision first
    const forcedDecisionResponse = this.findValidatedForcedDecision(configObj, user, flagKey, rule.key);
    decideReasons.push(...forcedDecisionResponse.reasons);

    const forcedVariation = forcedDecisionResponse.result;
    if (forcedVariation) {
      return Value.of(op, {
        result: { variationKey: forcedVariation.key },
        reasons: decideReasons,
      });
    }
    const decisionVariationValue = this.resolveVariation(op, configObj, rule, user, decideOptions, userProfileTracker);

    return decisionVariationValue.then((variationResult) => {
      decideReasons.push(...variationResult.reasons);
      return Value.of(op, {
        error: variationResult.error,
        result: variationResult.result,
        reasons: decideReasons,
      });
    });

    // return response;

    // decideReasons.push(...decisionVariation.reasons);
    // const variationKey = decisionVariation.result;

    // return {
    //   result: variationKey,
    //   reasons: decideReasons,
    // };
  }

  private getVariationFromDeliveryRule(
    configObj: ProjectConfig,
    flagKey: string,
    rules: Experiment[],
    ruleIndex: number,
    user: OptimizelyUserContext
  ): DeliveryRuleResponse<Variation | null, boolean> {
    const decideReasons: DecisionReason[] = [];
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
