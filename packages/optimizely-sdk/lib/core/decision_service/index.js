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
import { sprintf } from'@optimizely/js-sdk-utils';

import fns from '../../utils/fns';
import bucketer from '../bucketer';
import * as enums from '../../utils/enums';
import projectConfig from '../project_config';
import AudienceEvaluator from '../audience_evaluator';
import * as stringValidator from '../../utils/string_value_validator';
import { OptimizelyDecideOptions } from '../../shared_types';

var MODULE_NAME = 'DECISION_SERVICE';
var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var DECISION_SOURCES = enums.DECISION_SOURCES;
var AUDIENCE_EVALUATION_TYPES = enums.AUDIENCE_EVALUATION_TYPES;

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
 * @param   {Object} options
 * @param   {Object} options.userProfileService An instance of the user profile service for sticky bucketing.
 * @param   {Object} options.logger An instance of a logger to log messages.
 * @returns {Object}
 */
function DecisionService(options) {
  this.audienceEvaluator = new AudienceEvaluator(options.UNSTABLE_conditionEvaluators);
  this.forcedVariationMap = {};
  this.logger = options.logger;
  this.userProfileService = options.userProfileService || null;
}

/**
 * Gets variation where visitor will be bucketed.
 * @param  {Object}                                 configObj         The parsed project configuration object
 * @param  {string}                                 experimentKey
 * @param  {string}                                 userId
 * @param  {Object}                                 attributes
 * @param  {[key: string]: boolean}                 options           Optional map of decide options
 * @return {Object}                                 DecisionResonse   DecisionResonse containing the variation the user is bucketed into
 *                                                                    and the decide reasons.
 */
DecisionService.prototype.getVariation = function(configObj, experimentKey, userId, attributes, options = {}) {
  // by default, the bucketing ID should be the user ID
  var bucketingId = this._getBucketingId(userId, attributes);
  var decideReasons = [];

  if (!this.__checkIfExperimentIsActive(configObj, experimentKey)) {
    var experimentNotRunningLogMessage = sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, MODULE_NAME, experimentKey);
    this.logger.log(LOG_LEVEL.INFO, experimentNotRunningLogMessage);
    decideReasons.push(experimentNotRunningLogMessage);
    return {
      result: null,
      reasons: decideReasons,
    };
  }
  var experiment = configObj.experimentKeyMap[experimentKey];
  var decisionForcedVariation = this.getForcedVariation(configObj, experimentKey, userId);
  decideReasons.push(...decisionForcedVariation.reasons);
  var forcedVariationKey = decisionForcedVariation.result;

  if (forcedVariationKey) {
    return {
      result: forcedVariationKey,
      reasons: decideReasons,
    };
  }
  var decisionWhitelistedVariation = this.__getWhitelistedVariation(experiment, userId);
  decideReasons.push(...decisionWhitelistedVariation.reasons);
  var variation = decisionWhitelistedVariation.result;

  if (variation) {
    return {
      result: variation.key,
      reasons: decideReasons,
    };
  }

  var shouldIgnoreUPS = options[OptimizelyDecideOptions.IGNORE_USER_PROFILE_SERVICE];

  // check for sticky bucketing if decide options do not include shouldIgnoreUPS
  if (!shouldIgnoreUPS) {
    var experimentBucketMap = this.__resolveExperimentBucketMap(userId, attributes);
    variation = this.__getStoredVariation(configObj, experiment, userId, experimentBucketMap);
    if (variation) {
      var returningStoredVariationMessage = sprintf(
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
  var decisionifUserIsInAudience = this.__checkIfUserIsInAudience(
    configObj,
    experimentKey,
    AUDIENCE_EVALUATION_TYPES.EXPERIMENT,
    userId,
    attributes,
    ''
  );
  decideReasons.push(...decisionifUserIsInAudience.reasons);
  if (!decisionifUserIsInAudience.result) {
    var userDoesNotMeetConditionsLogMessage = sprintf(
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

  var bucketerParams = this.__buildBucketerParams(configObj, experimentKey, bucketingId, userId);
  var decisionVariation = bucketer.bucket(bucketerParams);
  decideReasons.push(...decisionVariation.reasons);
  var variationId = decisionVariation.result;
  variation = configObj.variationIdMap[variationId];
  if (!variation) {
    var userHasNoVariationLogMessage = sprintf(
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

  var userInVariationLogMessage = sprintf(
    LOG_MESSAGES.USER_HAS_VARIATION,
    MODULE_NAME,
    userId,
    variation.key,
    experimentKey
  );
  this.logger.log(LOG_LEVEL.INFO, userInVariationLogMessage);
  decideReasons.push(userInVariationLogMessage);
  // persist bucketing
  this.__saveUserProfile(experiment, variation, userId, experimentBucketMap);

  return {
    result: variation.key,
    reasons: decideReasons,
  };
};

/**
 * Merges attributes from attributes[STICKY_BUCKETING_KEY] and userProfileService
 * @param  {Object} attributes
 * @return {Object} finalized copy of experiment_bucket_map
 */
DecisionService.prototype.__resolveExperimentBucketMap = function(userId, attributes) {
  attributes = attributes || {};
  var userProfile = this.__getUserProfile(userId) || {};
  var attributeExperimentBucketMap = attributes[enums.CONTROL_ATTRIBUTES.STICKY_BUCKETING_KEY];
  return fns.assign({}, userProfile.experiment_bucket_map, attributeExperimentBucketMap);
};

/**
 * Checks whether the experiment is running
 * @param  {Object}  configObj     The parsed project configuration object
 * @param  {string}  experimentKey Key of experiment being validated
 * @param  {string}  userId        ID of user
 * @return {boolean} True if experiment is running
 */
DecisionService.prototype.__checkIfExperimentIsActive = function(configObj, experimentKey) {
 return projectConfig.isActive(configObj, experimentKey);
};

/**
 * Checks if user is whitelisted into any variation and return that variation if so
 * @param  {Object}           experiment
 * @param  {string}           userId
 * @return {Object}           DecisionResponse containing the forced variation if it exists
 *                            for user ID and the decide reasons.
 */
DecisionService.prototype.__getWhitelistedVariation = function(experiment, userId) {
  var decideReasons = [];
  if (experiment.forcedVariations && experiment.forcedVariations.hasOwnProperty(userId)) {
    var forcedVariationKey = experiment.forcedVariations[userId];
    if (experiment.variationKeyMap.hasOwnProperty(forcedVariationKey)) {
      var forcedBucketingSucceededMessageLog = sprintf(
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
      var forcedBucketingFailedMessageLog = sprintf(
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
};

/**
 * Checks whether the user is included in experiment audience
 * @param  {Object}           configObj            The parsed project configuration object
 * @param  {string}           experimentKey        Key of experiment being validated
 * @param  {string}           evaluationAttribute  String representing experiment key or rule
 * @param  {string}           userId               ID of user
 * @param  {Object}           attributes           Optional parameter for user's attributes
 * @param  {string}           loggingKey           String representing experiment key or rollout rule. To be used in log messages only.
 * @return {DecisionResponse} DecisionResponse     DecisionResponse containing result true if user meets audience conditions and
 *                                                 the decide reasons.
 */
DecisionService.prototype.__checkIfUserIsInAudience = function(configObj, experimentKey, evaluationAttribute, userId, attributes, loggingKey) {
  var decideReasons = [];
  var experimentAudienceConditions = projectConfig.getExperimentAudienceConditions(configObj, experimentKey);
  var audiencesById = projectConfig.getAudiencesById(configObj);
  var evaluatingAudiencesCombinedMessage = sprintf(
    LOG_MESSAGES.EVALUATING_AUDIENCES_COMBINED,
    MODULE_NAME,
    evaluationAttribute,
    loggingKey || experimentKey,
    JSON.stringify(experimentAudienceConditions)
  );
  this.logger.log(
    LOG_LEVEL.DEBUG,
    evaluatingAudiencesCombinedMessage
  );
  decideReasons.push(evaluatingAudiencesCombinedMessage);
  var result = this.audienceEvaluator.evaluate(experimentAudienceConditions, audiencesById, attributes);
  var audienceEvaluationResultCombinedMessage = sprintf(
    LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
    MODULE_NAME,
    evaluationAttribute,
    loggingKey || experimentKey,
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
};

/**
 * Given an experiment key and user ID, returns params used in bucketer call
 * @param  configObj     The parsed project configuration object
 * @param  experimentKey Experiment key used for bucketer
 * @param  bucketingId   ID to bucket user into
 * @param  userId        ID of user to be bucketed
 * @return {Object}
 */
DecisionService.prototype.__buildBucketerParams = function(configObj, experimentKey, bucketingId, userId) {
  var bucketerParams = {};
  bucketerParams.experimentKey = experimentKey;
  bucketerParams.experimentId = projectConfig.getExperimentId(configObj, experimentKey);
  bucketerParams.userId = userId;
  bucketerParams.trafficAllocationConfig = projectConfig.getTrafficAllocation(configObj, experimentKey);
  bucketerParams.experimentKeyMap = configObj.experimentKeyMap;
  bucketerParams.groupIdMap = configObj.groupIdMap;
  bucketerParams.variationIdMap = configObj.variationIdMap;
  bucketerParams.logger = this.logger;
  bucketerParams.bucketingId = bucketingId;
  return bucketerParams;
};

/**
 * Pull the stored variation out of the experimentBucketMap for an experiment/userId
 * @param  {Object}            configObj            The parsed project configuration object
 * @param  {Object}            experiment
 * @param  {String}            userId
 * @param  {Object}            experimentBucketMap  mapping experiment => { variation_id: <variationId> }
 * @return {Object}            the stored variation or null if the user profile does not have one for the given experiment
 */
DecisionService.prototype.__getStoredVariation = function(configObj, experiment, userId, experimentBucketMap) {
  if (experimentBucketMap.hasOwnProperty(experiment.id)) {
    var decision = experimentBucketMap[experiment.id];
    var variationId = decision.variation_id;
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
};

/**
 * Get the user profile with the given user ID
 * @param  {string} userId
 * @return {Object|undefined} the stored user profile or undefined if one isn't found
 */
DecisionService.prototype.__getUserProfile = function(userId) {
  var userProfile = {
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
};

/**
 * Saves the bucketing decision to the user profile
 * @param {Object} userProfile
 * @param {Object} experiment
 * @param {Object} variation
 * @param {Object} experimentBucketMap
 */
DecisionService.prototype.__saveUserProfile = function(experiment, variation, userId, experimentBucketMap) {
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
};

/**
 * Given a feature, user ID, and attributes, returns a decision response containing 
 * an object representing a decision and decide reasons. If the user was bucketed into
 * a variation for the given feature and attributes, the decision object will have variation and
 * experiment properties (both objects), as well as a decisionSource property.
 * decisionSource indicates whether the decision was due to a rollout or an
 * experiment.
 * @param   {Object}                      configObj         The parsed project configuration object
 * @param   {Object}                      feature           A feature flag object from project configuration
 * @param   {String}                      userId            A string identifying the user, for bucketing
 * @param   {Object}                      attributes        Optional user attributes
 * @param   {[key: string]: boolean}      options           Map of decide options
 * @return  {Object}                      DecisionResponse  DecisionResponse containing an object with experiment, variation, and decisionSource
 *                                                          properties and decide reasons. If the user was not bucketed into a variation, the variation
 *                                                          property in decision object is null.
 */
DecisionService.prototype.getVariationForFeature = function(configObj, feature, userId, attributes, options = {}) {
  var decideReasons = [];
  var decisionVariation = this._getVariationForFeatureExperiment(configObj, feature, userId, attributes, options);
  decideReasons.push(...decisionVariation.reasons);
  var experimentDecision = decisionVariation.result;

  if (experimentDecision.variation !== null) {
    return {
      result: experimentDecision,
      reasons: decideReasons,
    };
  }

  var decisionRolloutVariation = this._getVariationForRollout(configObj, feature, userId, attributes);
  decideReasons.push(...decisionRolloutVariation.reasons);
  var rolloutDecision = decisionRolloutVariation.result;
  if (rolloutDecision.variation !== null) {
    var userInRolloutMessage = sprintf(LOG_MESSAGES.USER_IN_ROLLOUT, MODULE_NAME, userId, feature.key);
    this.logger.log(LOG_LEVEL.DEBUG, userInRolloutMessage);
    decideReasons.push(userInRolloutMessage);
    return {
      result: rolloutDecision,
      reasons: decideReasons,
    };
  }

  var userNotnRolloutMessage = sprintf(LOG_MESSAGES.USER_NOT_IN_ROLLOUT, MODULE_NAME, userId, feature.key);
  this.logger.log(LOG_LEVEL.DEBUG, userNotnRolloutMessage);
  decideReasons.push(userNotnRolloutMessage);
  return {
    result: rolloutDecision,
    reasons: decideReasons,
  };
};


DecisionService.prototype._getVariationForFeatureExperiment = function(configObj, feature, userId, attributes, options = {}) {
  var decideReasons = [];
  var experiment = null;
  var variationKey = null;
  let decisionVariation;

  if (feature.hasOwnProperty('groupId')) {
    var group = configObj.groupIdMap[feature.groupId];
    if (group) {
      experiment = this._getExperimentInGroup(configObj, group, userId);
      if (experiment && feature.experimentIds.indexOf(experiment.id) !== -1) {
        decisionVariation = this.getVariation(configObj, experiment.key, userId, attributes, options);
        decideReasons.push(...decisionVariation.reasons);
        variationKey = decisionVariation.result;
      }
    }
  } else if (feature.experimentIds.length > 0) {
    // If the feature does not have a group ID, then it can only be associated
    // with one experiment, so we look at the first experiment ID only
    experiment = projectConfig.getExperimentFromId(configObj, feature.experimentIds[0], this.logger);
    if (experiment) {
      decisionVariation = this.getVariation(configObj, experiment.key, userId, attributes, options);
      decideReasons.push(...decisionVariation.reasons);
      variationKey = decisionVariation.result;
    }
  } else {
    var featureHasNoExperimentsMessage = sprintf(LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS, MODULE_NAME, feature.key);
    this.logger.log(LOG_LEVEL.DEBUG, featureHasNoExperimentsMessage);
    decideReasons.push(featureHasNoExperimentsMessage);
  }

  var variation = null;
  if (variationKey !== null && experiment !== null) {
    variation = experiment.variationKeyMap[variationKey];
  }

  var variationForFeatureExperiment = {
    experiment: experiment,
    variation: variation,
    decisionSource: DECISION_SOURCES.FEATURE_TEST,
  };

  return {
    result: variationForFeatureExperiment,
    reasons: decideReasons,
  };
};

DecisionService.prototype._getExperimentInGroup = function(configObj, group, userId) {
  var experimentId = bucketer.bucketUserIntoExperiment(group, userId, userId, this.logger);
  if (experimentId) {
    this.logger.log(
      LOG_LEVEL.INFO,
      sprintf(LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP, MODULE_NAME, userId, experimentId, group.id)
    );
    var experiment = projectConfig.getExperimentFromId(configObj, experimentId, this.logger);
    if (experiment) {
      return experiment;
    }
  }

  this.logger.log(
    LOG_LEVEL.INFO,
    sprintf(LOG_MESSAGES.USER_NOT_BUCKETED_INTO_ANY_EXPERIMENT_IN_GROUP, MODULE_NAME, userId, group.id)
  );
  return null;
};

DecisionService.prototype._getVariationForRollout = function(configObj, feature, userId, attributes) {
  var decideReasons = [];
  var decisionObj = {};
  if (!feature.rolloutId) {
    var noRolloutExistsMessage = sprintf(LOG_MESSAGES.NO_ROLLOUT_EXISTS, MODULE_NAME, feature.key);
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

  var rollout = configObj.rolloutIdMap[feature.rolloutId];
  if (!rollout) {
    var invalidRolloutIdMessage = sprintf(
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
    var rolloutHasNoExperimentsMessage = sprintf(
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

  var bucketingId = this._getBucketingId(userId, attributes);

  // The end index is length - 1 because the last experiment is assumed to be
  // "everyone else", which will be evaluated separately outside this loop
  var endIndex = rollout.experiments.length - 1;
  var index;
  var rolloutRule;
  var bucketerParams;
  var variationId;
  var variation;
  var loggingKey;
  var decisionVariation;
  var decisionifUserIsInAudience;
  for (index = 0; index < endIndex; index++) {
    rolloutRule = configObj.experimentKeyMap[rollout.experiments[index].key];
    loggingKey = index + 1;
    decisionifUserIsInAudience = this.__checkIfUserIsInAudience(
      configObj,
      rolloutRule.key,
      AUDIENCE_EVALUATION_TYPES.RULE,
      userId,
      attributes,
      loggingKey
    );
    decideReasons.push(...decisionifUserIsInAudience.reasons);
    if (!decisionifUserIsInAudience.result) {
      var userDoesNotMeetConditionsForTargetingRuleMessage = sprintf(
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

    var userMeetsConditionsForTargetingRuleMessage = sprintf(
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
    bucketerParams = this.__buildBucketerParams(configObj, rolloutRule.key, bucketingId, userId);
    decisionVariation = bucketer.bucket(bucketerParams);
    decideReasons.push(...decisionVariation.reasons);
    variationId = decisionVariation.result;
    variation = configObj.variationIdMap[variationId];
    if (variation) {
      var userBucketeredIntoTargetingRuleMessage = sprintf(
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
      var userNotBucketeredIntoTargetingRuleMessage = sprintf(
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

  var everyoneElseRule = configObj.experimentKeyMap[rollout.experiments[endIndex].key];
  var decisionifUserIsInEveryoneRule = this.__checkIfUserIsInAudience(
    configObj,
    everyoneElseRule.key,
    AUDIENCE_EVALUATION_TYPES.RULE,
    userId,
    attributes,
    'Everyone Else'
  );
  decideReasons.push(...decisionifUserIsInEveryoneRule.reasons);
  if (decisionifUserIsInEveryoneRule.result) {
    var userMeetsConditionsForEveryoneTargetingRuleMessage = sprintf(
      LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
      MODULE_NAME, userId,
      'Everyone Else'
    );
    this.logger.log(
      LOG_LEVEL.DEBUG,
      userMeetsConditionsForEveryoneTargetingRuleMessage
    );
    decideReasons.push(userMeetsConditionsForEveryoneTargetingRuleMessage);
    bucketerParams = this.__buildBucketerParams(configObj, everyoneElseRule.key, bucketingId, userId);
    decisionVariation = bucketer.bucket(bucketerParams);
    decideReasons.push(...decisionVariation.reasons);
    variationId = decisionVariation.result;
    variation = configObj.variationIdMap[variationId];
    if (variation) {
      var userBucketeredIntoEveryoneTargetingRuleMessage = sprintf(
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
      var userNotBucketeredIntoEveryoneTargetingRuleMessage = sprintf(
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
};

/**
 * Get bucketing Id from user attributes.
 * @param {String} userId
 * @param {Object} attributes
 * @returns {String} Bucketing Id if it is a string type in attributes, user Id otherwise.
 */
DecisionService.prototype._getBucketingId = function(userId, attributes) {
  var bucketingId = userId;

  // If the bucketing ID key is defined in attributes, than use that in place of the userID for the murmur hash key
  if (
    attributes != null &&
    typeof attributes === 'object' &&
    attributes.hasOwnProperty(enums.CONTROL_ATTRIBUTES.BUCKETING_ID)
  ) {
    if (typeof attributes[enums.CONTROL_ATTRIBUTES.BUCKETING_ID] === 'string') {
      bucketingId = attributes[enums.CONTROL_ATTRIBUTES.BUCKETING_ID];
      this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.VALID_BUCKETING_ID, MODULE_NAME, bucketingId));
    } else {
      this.logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.BUCKETING_ID_NOT_STRING, MODULE_NAME));
    }
  }

  return bucketingId;
};

/**
 * Removes forced variation for given userId and experimentKey
 * @param  {string} userId         String representing the user id
 * @param  {number} experimentId   Number representing the experiment id
 * @param  {string} experimentKey  Key representing the experiment id
 * @throws If the user id is not valid or not in the forced variation map
 */
DecisionService.prototype.removeForcedVariation = function(userId, experimentId, experimentKey) {
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
};

/**
 * Sets forced variation for given userId and experimentKey
 * @param  {string} userId        String representing the user id
 * @param  {number} experimentId  Number representing the experiment id
 * @param  {number} variationId   Number representing the variation id
 * @throws If the user id is not valid
 */
DecisionService.prototype.__setInForcedVariationMap = function(userId, experimentId, variationId) {
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
};

/**
 * Gets the forced variation key for the given user and experiment.
 * @param  {Object}           configObj         Object representing project configuration
 * @param  {string}           experimentKey     Key for experiment.
 * @param  {string}           userId            The user Id.
 * @return {Object}           DecisionResponse  DecisionResponse containing variation which the given user and experiment
 *                                              should be forced into and the decide reasons.
 */
DecisionService.prototype.getForcedVariation = function(configObj, experimentKey, userId) {
  var decideReasons = [];
  var experimentToVariationMap = this.forcedVariationMap[userId];
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

  var experimentId;
  try {
    var experiment = projectConfig.getExperimentFromKey(configObj, experimentKey);
    if (experiment.hasOwnProperty('id')) {
      experimentId = experiment['id'];
    } else {
      // catching improperly formatted experiments
      var improperlyFormattedExperimentMessage = sprintf(
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

  var variationId = experimentToVariationMap[experimentId];
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

  var variationKey = projectConfig.getVariationKeyFromId(configObj, variationId);
  if (variationKey) {
    var userHasForcedVariationMessage = sprintf(
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
};

/**
 * Sets the forced variation for a user in a given experiment
 * @param  {Object}      configObj      Object representing project configuration
 * @param  {string}      experimentKey  Key for experiment.
 * @param  {string}      userId         The user Id.
 * @param  {string|null} variationKey   Key for variation. If null, then clear the existing experiment-to-variation mapping
 * @return {boolean}     A boolean value that indicates if the set completed successfully.
 */
DecisionService.prototype.setForcedVariation = function(configObj, experimentKey, userId, variationKey) {
  if (variationKey != null && !stringValidator.validate(variationKey)) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.INVALID_VARIATION_KEY, MODULE_NAME));
    return false;
  }

  var experimentId;
  try {
    var experiment = projectConfig.getExperimentFromKey(configObj, experimentKey);
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
      this.removeForcedVariation(userId, experimentId, experimentKey, this.logger);
      return true;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      return false;
    }
  }

  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);

  if (!variationId) {
    this.logger.log(
      LOG_LEVEL.ERROR,
      sprintf(ERROR_MESSAGES.NO_VARIATION_FOR_EXPERIMENT_KEY, MODULE_NAME, variationKey, experimentKey)
    );
    return false;
  }

  try {
    this.__setInForcedVariationMap(userId, experimentId, variationId);
    return true;
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    return false;
  }
};

/**
 * Creates an instance of the DecisionService.
 * @param  {Object} options               Configuration options
 * @param  {Object} options.userProfileService
 * @param  {Object} options.logger
 * @return {Object} An instance of the DecisionService
 */
export var createDecisionService = function(options) {
  return new DecisionService(options);
};

export default {
  createDecisionService: createDecisionService,
};
