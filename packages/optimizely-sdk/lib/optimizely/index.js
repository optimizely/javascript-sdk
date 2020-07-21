/****************************************************************************
 * Copyright 2016-2020, Optimizely, Inc. and contributors                   *
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
import { sprintf, objectValues } from '@optimizely/js-sdk-utils';
import * as eventProcessor from '@optimizely/js-sdk-event-processor';

import fns from '../utils/fns'
import { validate } from '../utils/attributes_validator';
import decisionService from '../core/decision_service';
import enums from '../utils/enums';
import { getImpressionEvent, getConversionEvent } from '../core/event_builder/index.js';
import { buildConversionEvent, buildImpressionEvent } from '../core/event_builder/event_helpers';
import * as eventTagsValidator from '../utils/event_tags_validator';
import notificationCenter from '../core/notification_center';
import projectConfig from '../core/project_config';
import * as userProfileServiceValidator from '../utils/user_profile_service_validator';
import * as stringValidator from '../utils/string_value_validator';
import projectConfigManager from '../core/project_config/project_config_manager';

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'OPTIMIZELY';
var DECISION_SOURCES = enums.DECISION_SOURCES;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;
var DECISION_NOTIFICATION_TYPES = enums.DECISION_NOTIFICATION_TYPES;
var NOTIFICATION_TYPES = enums.NOTIFICATION_TYPES;

var DEFAULT_ONREADY_TIMEOUT = 30000;

/**
 * The Optimizely class
 * @param {Object} config
 * @param {string} config.clientEngine
 * @param {string} config.clientVersion
 * @param {Object} config.datafile
 * @param {Object} config.errorHandler
 * @param {Object} config.eventDispatcher
 * @param {Object} config.logger
 * @param {Object} config.userProfileService
 * @param {Object} config.eventBatchSize
 * @param {Object} config.eventFlushInterval
 */
function Optimizely(config) {
  var clientEngine = config.clientEngine;
  if (enums.VALID_CLIENT_ENGINES.indexOf(clientEngine) === -1) {
    config.logger.log(
      LOG_LEVEL.INFO,
      sprintf(LOG_MESSAGES.INVALID_CLIENT_ENGINE, MODULE_NAME, clientEngine)
    );
    clientEngine = enums.NODE_CLIENT_ENGINE;
  }

  this.clientEngine = clientEngine;
  this.clientVersion = config.clientVersion || enums.NODE_CLIENT_VERSION;
  this.errorHandler = config.errorHandler;
  this.eventDispatcher = config.eventDispatcher;
  this.__isOptimizelyConfigValid = config.isValidInstance;
  this.logger = config.logger;

  this.projectConfigManager = new projectConfigManager.ProjectConfigManager({
    datafile: config.datafile,
    datafileOptions: config.datafileOptions,
    jsonSchemaValidator: config.jsonSchemaValidator,
    sdkKey: config.sdkKey,
  });

  this.__disposeOnUpdate = this.projectConfigManager.onUpdate(
    function(configObj) {
      this.logger.log(
        LOG_LEVEL.INFO,
        sprintf(LOG_MESSAGES.UPDATED_OPTIMIZELY_CONFIG, MODULE_NAME, configObj.revision, configObj.projectId)
      );
      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
    }.bind(this)
  );

  this.__readyPromise = this.projectConfigManager.onReady();

  var userProfileService = null;
  if (config.userProfileService) {
    try {
      if (userProfileServiceValidator.validate(config.userProfileService)) {
        userProfileService = config.userProfileService;
        this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.VALID_USER_PROFILE_SERVICE, MODULE_NAME));
      }
    } catch (ex) {
      this.logger.log(LOG_LEVEL.WARNING, ex.message);
    }
  }

  this.decisionService = decisionService.createDecisionService({
    userProfileService: userProfileService,
    logger: this.logger,
    UNSTABLE_conditionEvaluators: config.UNSTABLE_conditionEvaluators,
  });

  this.notificationCenter = notificationCenter.createNotificationCenter({
    logger: this.logger,
    errorHandler: this.errorHandler,
  });

  this.eventProcessor = new eventProcessor.LogTierV1EventProcessor({
    dispatcher: this.eventDispatcher,
    flushInterval: config.eventFlushInterval,
    maxQueueSize: config.eventBatchSize,
    notificationCenter: this.notificationCenter,
  });
  this.eventProcessor.start();

  this.__readyTimeouts = {};
  this.__nextReadyTimeoutId = 0;
}

/**
 * Returns a truthy value if this instance currently has a valid project config
 * object, and the initial configuration object that was passed into the
 * constructor was also valid.
 * @return {*}
 */
Optimizely.prototype.__isValidInstance = function() {
  return this.__isOptimizelyConfigValid && this.projectConfigManager.getConfig();
};

/**
 * Buckets visitor and sends impression event to Optimizely.
 * @param  {string}      experimentKey
 * @param  {string}      userId
 * @param  {Object}      attributes
 * @return {string|null} variation key
 */
Optimizely.prototype.activate = function(experimentKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'activate'));
      return null;
    }

    if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
      return this.__notActivatingExperiment(experimentKey, userId);
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }

    try {
      var variationKey = this.getVariation(experimentKey, userId, attributes);
      if (variationKey === null) {
        return this.__notActivatingExperiment(experimentKey, userId);
      }

      // If experiment is not set to 'Running' status, log accordingly and return variation key
      if (!projectConfig.isRunning(configObj, experimentKey)) {
        var shouldNotDispatchActivateLogMessage = sprintf(
          LOG_MESSAGES.SHOULD_NOT_DISPATCH_ACTIVATE,
          MODULE_NAME,
          experimentKey
        );
        this.logger.log(LOG_LEVEL.DEBUG, shouldNotDispatchActivateLogMessage);
        return variationKey;
      }

      this._sendImpressionEvent(experimentKey, variationKey, userId, attributes);

      return variationKey;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      var failedActivationLogMessage = sprintf(
        LOG_MESSAGES.NOT_ACTIVATING_USER,
        MODULE_NAME,
        userId,
        experimentKey
      );
      this.logger.log(LOG_LEVEL.INFO, failedActivationLogMessage);
      this.errorHandler.handleError(ex);
      return null;
    }
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Create an impression event and call the event dispatcher's dispatch method to
 * send this event to Optimizely. Then use the notification center to trigger
 * any notification listeners for the ACTIVATE notification type.
 * @param {string} experimentKey  Key of experiment that was activated
 * @param {string} variationKey   Key of variation shown in experiment that was activated
 * @param {string} userId         ID of user to whom the variation was shown
 * @param {Object} attributes     Optional user attributes
 */
Optimizely.prototype._sendImpressionEvent = function(experimentKey, variationKey, userId, attributes) {
  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return;
  }

  var impressionEvent = buildImpressionEvent({
    experimentKey: experimentKey,
    variationKey: variationKey,
    userId: userId,
    userAttributes: attributes,
    clientEngine: this.clientEngine,
    clientVersion: this.clientVersion,
    configObj: configObj,
  });
  // TODO is it okay to not pass a projectConfig as second argument
  this.eventProcessor.process(impressionEvent);
  this.__emitNotificationCenterActivate(experimentKey, variationKey, userId, attributes);
};

/**
 * Emit the ACTIVATE notification on the notificationCenter
 * @param {string} experimentKey  Key of experiment that was activated
 * @param {string} variationKey   Key of variation shown in experiment that was activated
 * @param {string} userId         ID of user to whom the variation was shown
 * @param {Object} attributes     Optional user attributes
 */
Optimizely.prototype.__emitNotificationCenterActivate = function(experimentKey, variationKey, userId, attributes) {
  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return;
  }

  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);
  var experimentId = projectConfig.getExperimentId(configObj, experimentKey);
  var impressionEventOptions = {
    attributes: attributes,
    clientEngine: this.clientEngine,
    clientVersion: this.clientVersion,
    configObj: configObj,
    experimentId: experimentId,
    userId: userId,
    variationId: variationId,
    logger: this.logger,
  };
  var impressionEvent = getImpressionEvent(impressionEventOptions);
  var experiment = configObj.experimentKeyMap[experimentKey];
  var variation;
  if (experiment && experiment.variationKeyMap) {
    variation = experiment.variationKeyMap[variationKey];
  }
  this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {
    experiment: experiment,
    userId: userId,
    attributes: attributes,
    variation: variation,
    logEvent: impressionEvent,
  });
};

/**
 * Sends conversion event to Optimizely.
 * @param  {string} eventKey
 * @param  {string} userId
 * @param  {string} attributes
 * @param  {Object} eventTags Values associated with the event.
 */
Optimizely.prototype.track = function(eventKey, userId, attributes, eventTags) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'track'));
      return;
    }

    if (!this.__validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
      return;
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return;
    }

    if (!projectConfig.eventWithKeyExists(configObj, eventKey)) {
      this.logger.log(
        LOG_LEVEL.WARNING,
        sprintf(enums.LOG_MESSAGES.EVENT_KEY_NOT_FOUND, MODULE_NAME, eventKey)
      );
      this.logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId));
      return;
    }

    // remove null values from eventTags
    eventTags = this.__filterEmptyValues(eventTags);
    var conversionEvent = buildConversionEvent({
      eventKey: eventKey,
      eventTags: eventTags,
      userId: userId,
      userAttributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: configObj,
    });
    this.logger.log(LOG_LEVEL.INFO, sprintf(enums.LOG_MESSAGES.TRACK_EVENT, MODULE_NAME, eventKey, userId));
    // TODO is it okay to not pass a projectConfig as second argument
    this.eventProcessor.process(conversionEvent);
    this.__emitNotificationCenterTrack(eventKey, userId, attributes, eventTags);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    var failedTrackLogMessage = sprintf(LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId);
    this.logger.log(LOG_LEVEL.ERROR, failedTrackLogMessage);
  }
};

/**
 * Send TRACK event to notificationCenter
 * @param  {string} eventKey
 * @param  {string} userId
 * @param  {string} attributes
 * @param  {Object} eventTags Values associated with the event.
 */
Optimizely.prototype.__emitNotificationCenterTrack = function(eventKey, userId, attributes, eventTags) {
  try {
    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return;
    }

    var conversionEventOptions = {
      attributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: configObj,
      eventKey: eventKey,
      eventTags: eventTags,
      logger: this.logger,
      userId: userId,
    };
    var conversionEvent = getConversionEvent(conversionEventOptions);

    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.TRACK, {
      eventKey: eventKey,
      userId: userId,
      attributes: attributes,
      eventTags: eventTags,
      logEvent: conversionEvent,
    });
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
  }
};

/**
 * Gets variation where visitor will be bucketed.
 * @param  {string}      experimentKey
 * @param  {string}      userId
 * @param  {Object}      attributes
 * @return {string|null} variation key
 */
Optimizely.prototype.getVariation = function(experimentKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getVariation'));
      return null;
    }

    try {
      if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
        return null;
      }

      var configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return null;
      }

      var experiment = configObj.experimentKeyMap[experimentKey];
      if (!experiment) {
        this.logger.log(
          LOG_LEVEL.DEBUG,
          sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey)
        );
        return null;
      }

      var variationKey = this.decisionService.getVariation(configObj, experimentKey, userId, attributes);
      var decisionNotificationType = projectConfig.isFeatureExperiment(configObj, experiment.id)
        ? DECISION_NOTIFICATION_TYPES.FEATURE_TEST
        : DECISION_NOTIFICATION_TYPES.AB_TEST;

      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
        type: decisionNotificationType,
        userId: userId,
        attributes: attributes || {},
        decisionInfo: {
          experimentKey: experimentKey,
          variationKey: variationKey,
        },
      });

      return variationKey;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      this.errorHandler.handleError(ex);
      return null;
    }
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Force a user into a variation for a given experiment.
 * @param {string} experimentKey
 * @param {string} userId
 * @param {string|null} variationKey user will be forced into. If null, then clear the existing experiment-to-variation mapping.
 * @return boolean A boolean value that indicates if the set completed successfully.
 */
Optimizely.prototype.setForcedVariation = function(experimentKey, userId, variationKey) {
  if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId })) {
    return false;
  }

  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return false;
  }

  try {
    return this.decisionService.setForcedVariation(configObj, experimentKey, userId, variationKey);
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
    return false;
  }
};

/**
 * Gets the forced variation for a given user and experiment.
 * @param  {string} experimentKey
 * @param  {string} userId
 * @return {string|null} The forced variation key.
 */
Optimizely.prototype.getForcedVariation = function(experimentKey, userId) {
  if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId })) {
    return null;
  }

  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return null;
  }

  try {
    return this.decisionService.getForcedVariation(configObj, experimentKey, userId);
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
    return null;
  }
};

/**
 * Validate string inputs, user attributes and event tags.
 * @param  {string}  stringInputs   Map of string keys and associated values
 * @param  {Object}  userAttributes Optional parameter for user's attributes
 * @param  {Object}  eventTags      Optional parameter for event tags
 * @return {boolean} True if inputs are valid
 *
 */
Optimizely.prototype.__validateInputs = function(stringInputs, userAttributes, eventTags) {
  try {
    // Null, undefined or non-string user Id is invalid.
    if (stringInputs.hasOwnProperty('user_id')) {
      var userId = stringInputs.user_id;
      if (typeof userId !== 'string' || userId === null || userId === 'undefined') {
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME, 'user_id'));
      }

      delete stringInputs.user_id;
    }

    var inputKeys = Object.keys(stringInputs);
    for (var index = 0; index < inputKeys.length; index++) {
      var key = inputKeys[index];
      if (!stringValidator.validate(stringInputs[key])) {
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME, key));
      }
    }
    if (userAttributes) {
      validate(userAttributes);
    }
    if (eventTags) {
      eventTagsValidator.validate(eventTags);
    }
    return true;
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
    return false;
  }
};

/**
 * Shows failed activation log message and returns null when user is not activated in experiment
 * @param  experimentKey
 * @param  userId
 * @return {null}
 */
Optimizely.prototype.__notActivatingExperiment = function(experimentKey, userId) {
  var failedActivationLogMessage = sprintf(
    LOG_MESSAGES.NOT_ACTIVATING_USER,
    MODULE_NAME,
    userId,
    experimentKey
  );
  this.logger.log(LOG_LEVEL.INFO, failedActivationLogMessage);
  return null;
};

/**
 * Filters out attributes/eventTags with null or undefined values
 * @param  map
 * @returns {Object} map
 */
Optimizely.prototype.__filterEmptyValues = function(map) {
  for (var key in map) {
    if (map.hasOwnProperty(key) && (map[key] === null || map[key] === undefined)) {
      delete map[key];
    }
  }
  return map;
};

/**
 * Returns true if the feature is enabled for the given user.
 * @param {string} featureKey   Key of feature which will be checked
 * @param {string} userId       ID of user which will be checked
 * @param {Object} attributes   Optional user attributes
 * @return {boolean}            True if the feature is enabled for the user, false otherwise
 */
Optimizely.prototype.isFeatureEnabled = function(featureKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(
        LOG_LEVEL.ERROR,
        sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'isFeatureEnabled')
      );
      return false;
    }

    if (!this.__validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
      return false;
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return false;
    }

    var feature = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
    if (!feature) {
      return false;
    }

    var featureEnabled = false;
    var decision = this.decisionService.getVariationForFeature(configObj, feature, userId, attributes);
    var variation = decision.variation;
    var sourceInfo = {};

    if (variation) {
      featureEnabled = variation.featureEnabled;
      if (decision.decisionSource === DECISION_SOURCES.FEATURE_TEST) {
        sourceInfo = {
          experimentKey: decision.experiment.key,
          variationKey: decision.variation.key,
        };
        // got a variation from the exp, so we track the impression
        this._sendImpressionEvent(decision.experiment.key, decision.variation.key, userId, attributes);
      }
    }

    if (featureEnabled === true) {
      this.logger.log(
        LOG_LEVEL.INFO,
        sprintf(LOG_MESSAGES.FEATURE_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId)
      );
    } else {
      this.logger.log(
        LOG_LEVEL.INFO,
        sprintf(LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId)
      );
      featureEnabled = false;
    }

    var featureInfo = {
      featureKey: featureKey,
      featureEnabled: featureEnabled,
      source: decision.decisionSource,
      sourceInfo: sourceInfo,
    };

    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
      type: DECISION_NOTIFICATION_TYPES.FEATURE,
      userId: userId,
      attributes: attributes || {},
      decisionInfo: featureInfo,
    });

    return featureEnabled;
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return false;
  }
};

/**
 * Returns an Array containing the keys of all features in the project that are
 * enabled for the given user.
 * @param {string} userId
 * @param {Object} attributes
 * @return {Array} Array of feature keys (strings)
 */
Optimizely.prototype.getEnabledFeatures = function(userId, attributes) {
  try {
    var enabledFeatures = [];
    if (!this.__isValidInstance()) {
      this.logger.log(
        LOG_LEVEL.ERROR,
        sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getEnabledFeatures')
      );
      return enabledFeatures;
    }

    if (!this.__validateInputs({ user_id: userId })) {
      return enabledFeatures;
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return enabledFeatures;
    }

    objectValues(configObj.featureKeyMap).forEach(
      function(feature) {
        if (this.isFeatureEnabled(feature.key, userId, attributes)) {
          enabledFeatures.push(feature.key);
        }
      }.bind(this)
    );

    return enabledFeatures;
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return [];
  }
};

/**
 * Returns dynamically-typed value of the variable attached to the given
 * feature flag. Returns null if the feature key or variable key is invalid.
 *
 * @param {string} featureKey           Key of the feature whose variable's
 *                                      value is being accessed
 * @param {string} variableKey          Key of the variable whose value is
 *                                      being accessed
 * @param {string} userId               ID for the user
 * @param {Object} attributes           Optional user attributes
 * @return {string|boolean|number|null} Value of the variable cast to the appropriate
 *                                      type, or null if the feature key is invalid or
 *                                      the variable key is invalid
 */

Optimizely.prototype.getFeatureVariable = function(featureKey, variableKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariable'));
      return null;
    }
    return this._getFeatureVariableForType(featureKey, variableKey, null, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Helper method to get the value for a variable of a certain type attached to a
 * feature flag. Returns null if the feature key is invalid, the variable key is
 * invalid, the given variable type does not match the variable's actual type,
 * or the variable value cannot be cast to the required type. If the given variable
 * type is null, the value of the variable cast to the appropriate type is returned.
 *
 * @param {string} featureKey           Key of the feature whose variable's value is
 *                                      being accessed
 * @param {string} variableKey          Key of the variable whose value is being
 *                                      accessed
 * @param {string|null} variableType    Type of the variable whose value is being
 *                                      accessed (must be one of FEATURE_VARIABLE_TYPES
 *                                      in lib/utils/enums/index.js), or null to return the
 *                                      value of the variable cast to the appropriate type
 * @param {string} userId               ID for the user
 * @param {Object} attributes           Optional user attributes
 * @return {string|boolean|number|null} Value of the variable cast to the appropriate
 *                                      type, or null if the feature key is invalid, the
 *                                      variable key is invalid, or there is a mismatch
 *                                      with the type of the variable
 */
Optimizely.prototype._getFeatureVariableForType = function(featureKey, variableKey, variableType, userId, attributes) {
  if (!this.__validateInputs({ feature_key: featureKey, variable_key: variableKey, user_id: userId }, attributes)) {
    return null;
  }

  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return null;
  }

  var featureFlag = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
  if (!featureFlag) {
    return null;
  }

  var variable = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, this.logger);
  if (!variable) {
    return null;
  }

  if (variableType && variable.type !== variableType) {
    this.logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.VARIABLE_REQUESTED_WITH_WRONG_TYPE, MODULE_NAME, variableType, variable.type)
    );
    return null;
  }
  
  var decision = this.decisionService.getVariationForFeature(configObj, featureFlag, userId, attributes);  
  var featureEnabled = decision.variation !== null ? decision.variation.featureEnabled : false;
  var variableValue = this._getFeatureVariableValueFromVariation(featureKey, featureEnabled, decision.variation, variable, userId);

  var sourceInfo = {};
  if (decision.decisionSource === DECISION_SOURCES.FEATURE_TEST) {
    sourceInfo = {
      experimentKey: decision.experiment.key,
      variationKey: decision.variation.key,
    };
  }
  
  this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
    userId: userId,
    attributes: attributes || {},
    decisionInfo: {
      featureKey: featureKey,
      featureEnabled: featureEnabled,
      source: decision.decisionSource,
      variableKey: variableKey,
      variableValue: variableValue,
      variableType: variable.type,
      sourceInfo: sourceInfo,
    },
  });
  return variableValue;
};

/**
 * Helper method to get the non type-casted value for a variable attached to a 
 * feature flag. Returns appropriate variable value depending on whether there 
 * was a matching variation, feature was enabled or not or varible was part of the 
 * available variation or not. Also logs the appropriate message explaining how it 
 * evaluated the value of the variable.
 *
 * @param {string} featureKey           Key of the feature whose variable's value is
 *                                      being accessed
 * @param {boolean} featureEnabled      Boolean indicating if feature is enabled or not
 * @param {object} variation            variation returned by decision service
 * @param {object} variable             varible whose value is being evaluated
 * @param {string} userId               ID for the user
 * @return {string|null}                String value of the variable or null if the config Obj
 *                                      is null
 */
Optimizely.prototype._getFeatureVariableValueFromVariation = function(featureKey, featureEnabled, variation, variable, userId) {
  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return null;
  }

  var variableValue = variable.defaultValue;
  if (variation !== null) {
    var value = projectConfig.getVariableValueForVariation(configObj, variable, variation, this.logger);
    if (value !== null) {
      if (featureEnabled) {
        variableValue = value;
        this.logger.log(
          LOG_LEVEL.INFO,
          sprintf(
            LOG_MESSAGES.USER_RECEIVED_VARIABLE_VALUE,
            MODULE_NAME,
            variable.key,
            featureKey,
            variableValue,
            userId
          )
        );
      } else {
        this.logger.log(
          LOG_LEVEL.INFO,
          sprintf(
            LOG_MESSAGES.FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE,
            MODULE_NAME,
            featureKey,
            userId,
            variable.key
          )
        );
      }
    } else {
      this.logger.log(
        LOG_LEVEL.INFO,
        sprintf(
          LOG_MESSAGES.VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE,
          MODULE_NAME,
          variable.key,
          variation.key
        )
      );
    }
  } else {
    this.logger.log(
      LOG_LEVEL.INFO,
      sprintf(
        LOG_MESSAGES.USER_RECEIVED_DEFAULT_VARIABLE_VALUE,
        MODULE_NAME,
        userId,
        variable.key,
        featureKey
      )
    );
  }
  
  return projectConfig.getTypeCastValue(variableValue, variable.type, this.logger);
}

/**
 * Returns value for the given boolean variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {boolean|null}       Boolean value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableBoolean = function(featureKey, variableKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableBoolean'));
      return null;
    }
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.BOOLEAN, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns value for the given double variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {number|null}        Number value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableDouble = function(featureKey, variableKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableDouble'));
      return null;
    }
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.DOUBLE, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns value for the given integer variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {number|null}        Number value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableInteger = function(featureKey, variableKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableInteger'));
      return null;
    }
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.INTEGER, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns value for the given string variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {string|null}        String value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableString = function(featureKey, variableKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableString'));
      return null;
    }
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.STRING, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns value for the given json variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {object|null}        Object value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableJSON = function(featureKey, variableKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableJSON'));
      return null;
    }
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.JSON, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns values for all the variables attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variables are being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {object|null}        Object containing all the variables, or null if the
 *                              feature key is invalid
 */
Optimizely.prototype.getAllFeatureVariables = function(featureKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getAllFeatureVariables'));
      return null;
    }

    if (!this.__validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
      return null;
    }
  
    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }
  
    var featureFlag = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
    if (!featureFlag) {
      return null;
    }
    
    var decision = this.decisionService.getVariationForFeature(configObj, featureFlag, userId, attributes);    
    var featureEnabled = decision.variation !== null ? decision.variation.featureEnabled : false;    
    var allVariables = {};
    
    featureFlag.variables.forEach(function (variable) {
      allVariables[variable.key] = this._getFeatureVariableValueFromVariation(featureKey, featureEnabled, decision.variation, variable, userId);
    }.bind(this));

    var sourceInfo = {};
    if (decision.decisionSource === DECISION_SOURCES.FEATURE_TEST) {
      sourceInfo = {
        experimentKey: decision.experiment.key,
        variationKey: decision.variation.key,
      };
    }
    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
      type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
      userId: userId,
      attributes: attributes || {},
      decisionInfo: {
        featureKey: featureKey,
        featureEnabled: featureEnabled,
        source: decision.decisionSource,        
        variableValues: allVariables,        
        sourceInfo: sourceInfo,
      },
    });

    return allVariables;
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns OptimizelyConfig object containing experiments and features data
 * @return {Object}
 *
 * OptimizelyConfig Object Schema
 * {
 *   'experimentsMap': {
 *     'my-fist-experiment': {
 *       'id': '111111',
 *       'key': 'my-fist-experiment'
 *       'variationsMap': {
 *         'variation_1': {
 *           'id': '121212',
 *           'key': 'variation_1',
 *           'variablesMap': {
 *             'age': {
 *               'id': '222222',
 *               'key': 'age',
 *               'type': 'integer',
 *               'value': '0',
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   'featuresMap': {
 *     'awesome-feature': {
 *       'id': '333333',
 *       'key': 'awesome-feature',
 *       'experimentsMap': Object,
 *       'variationsMap': Object,
 *     }
 *   }
 * }
 */
Optimizely.prototype.getOptimizelyConfig = function() {
  try {
    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }
    return this.projectConfigManager.getOptimizelyConfig();
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Stop background processes belonging to this instance, including:
 *
 * - Active datafile requests
 * - Pending datafile requests
 * - Pending event queue flushes
 *
 * In-flight datafile requests will be aborted. Any events waiting to be sent
 * as part of a batched event request will be immediately flushed to the event
 * dispatcher.
 *
 * Returns a Promise that fulfills after all in-flight event dispatcher requests
 * (including any final request resulting from flushing the queue as described
 * above) are complete. If there are no in-flight event dispatcher requests and
 * no queued events waiting to be sent, returns an immediately-fulfilled Promise.
 *
 * Returned Promises are fulfilled with result objects containing these
 * properties:
 *    - success (boolean): true if the event dispatcher signaled completion of
 *                         all in-flight and final requests, or if there were no
 *                         queued events and no in-flight requests. false if an
 *                         unexpected error was encountered during the close
 *                         process.
 *    - reason (string=):  If success is false, this is a string property with
 *                         an explanatory message.
 *
 * NOTE: After close is called, this instance is no longer usable - any events
 * generated will no longer be sent to the event dispatcher.
 *
 * @return {Promise}
 */
Optimizely.prototype.close = function() {
  try {
    var eventProcessorStoppedPromise = this.eventProcessor.stop();
    if (this.__disposeOnUpdate) {
      this.__disposeOnUpdate();
      this.__disposeOnUpdate = null;
    }
    if (this.projectConfigManager) {
      this.projectConfigManager.stop();
    }
    Object.keys(this.__readyTimeouts).forEach(
      function(readyTimeoutId) {
        var readyTimeoutRecord = this.__readyTimeouts[readyTimeoutId];
        clearTimeout(readyTimeoutRecord.readyTimeout);
        readyTimeoutRecord.onClose();
      }.bind(this)
    );
    this.__readyTimeouts = {};
    return eventProcessorStoppedPromise.then(
      function() {
        return {
          success: true,
        };
      },
      function(err) {
        return {
          success: false,
          reason: String(err),
        };
      }
    );
  } catch (err) {
    this.logger.log(LOG_LEVEL.ERROR, err.message);
    this.errorHandler.handleError(err);
    return Promise.resolve({
      success: false,
      reason: String(err),
    });
  }
};

/**
 * Returns a Promise that fulfills when this instance is ready to use (meaning
 * it has a valid datafile), or has failed to become ready within a period of
 * time (configurable by the timeout property of the options argument), or when
 * this instance is closed via the close method.
 *
 * If a valid datafile was provided in the constructor, the returned Promise is
 * immediately fulfilled. If an sdkKey was provided, a manager will be used to
 * fetch  a datafile, and the returned promise will fulfill if that fetch
 * succeeds or fails before the timeout. The default timeout is 30 seconds,
 * which will be used if no timeout is provided in the argument options object.
 *
 * The returned Promise is fulfilled with a result object containing these
 * properties:
 *    - success (boolean): True if this instance is ready to use with a valid
 *                         datafile, or false if this instance failed to become
 *                         ready or was closed prior to becoming ready.
 *    - reason (string=):  If success is false, this is a string property with
 *                         an explanatory message. Failure could be due to
 *                         expiration of the timeout, network errors,
 *                         unsuccessful responses, datafile parse errors,
 *                         datafile validation errors, or the instance being
 *                         closed
 * @param  {Object=}          options
 * @param  {number|undefined} options.timeout
 * @return {Promise}
 */
Optimizely.prototype.onReady = function(options) {
  var timeout;
  if (typeof options === 'object' && options !== null) {
    timeout = options.timeout;
  }
  if (!fns.isSafeInteger(timeout)) {
    timeout = DEFAULT_ONREADY_TIMEOUT;
  }

  var resolveTimeoutPromise;
  var timeoutPromise = new Promise(function(resolve) {
    resolveTimeoutPromise = resolve;
  });

  var timeoutId = this.__nextReadyTimeoutId;
  this.__nextReadyTimeoutId++;

  var onReadyTimeout = function() {
    delete this.__readyTimeouts[timeoutId];
    resolveTimeoutPromise({
      success: false,
      reason: sprintf('onReady timeout expired after %s ms', timeout),
    });
  }.bind(this);
  var readyTimeout = setTimeout(onReadyTimeout, timeout);
  var onClose = function() {
    resolveTimeoutPromise({
      success: false,
      reason: 'Instance closed',
    });
  };

  this.__readyTimeouts[timeoutId] = {
    readyTimeout: readyTimeout,
    onClose: onClose,
  };

  this.__readyPromise.then(
    function() {
      clearTimeout(readyTimeout);
      delete this.__readyTimeouts[timeoutId];
      resolveTimeoutPromise({
        success: true,
      });
    }.bind(this)
  );

  return Promise.race([this.__readyPromise, timeoutPromise]);
};

export default Optimizely;
