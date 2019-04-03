/****************************************************************************
 * Copyright 2016-2019, Optimizely, Inc. and contributors                   *
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

var fns = require('../utils/fns');
var attributesValidator = require('../utils/attributes_validator');
var decisionService = require('../core/decision_service');
var enums = require('../utils/enums');
var eventBuilder = require('../core/event_builder/index.js');
var eventHelpers = require('../core/event_builder/event_helpers');
var eventProcessor = require('@optimizely/js-sdk-event-processor');
var eventTagsValidator = require('../utils/event_tags_validator');
var notificationCenter = require('../core/notification_center');
var projectConfig = require('../core/project_config');
var projectConfigSchema = require('./project_config_schema');
var sprintf = require('@optimizely/js-sdk-utils').sprintf;
var userProfileServiceValidator = require('../utils/user_profile_service_validator');
var stringValidator = require('../utils/string_value_validator');
var configValidator = require('../utils/config_validator');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'OPTIMIZELY';
var DECISION_SOURCES = enums.DECISION_SOURCES;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;
var DECISION_INFO_TYPES = enums.DECISION_INFO_TYPES;
var NOTIFICATION_TYPES = enums.NOTIFICATION_TYPES;

var DEFAULT_EVENT_MAX_QUEUE_SIZE = 1;
var DEFAULT_EVENT_FLUSH_INTERVAL = 5000;

/**
 * The Optimizely class
 * @param {Object} config
 * @param {string} config.clientEngine
 * @param {string} config.clientVersion
 * @param {Object} config.datafile
 * @param {Object} config.errorHandler
 * @param {Object} config.eventDispatcher
 * @param {Object} config.logger
 * @param {Object} config.skipJSONValidation
 * @param {Object} config.userProfileService
 * @param {Object} config.eventBatchSize
 * @param {Object} config.eventFlushInterval
 */
function Optimizely(config) {
  var clientEngine = config.clientEngine;
  if (clientEngine !== enums.NODE_CLIENT_ENGINE && clientEngine !== enums.JAVASCRIPT_CLIENT_ENGINE) {
    config.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.INVALID_CLIENT_ENGINE, MODULE_NAME, clientEngine));
    clientEngine = enums.NODE_CLIENT_ENGINE;
  }

  this.clientEngine = clientEngine;
  this.clientVersion = config.clientVersion || enums.NODE_CLIENT_VERSION;
  this.errorHandler = config.errorHandler;
  this.eventDispatcher = config.eventDispatcher;
  this.isValidInstance = config.isValidInstance;
  this.logger = config.logger;

  try {
    configValidator.validateDatafile(config.datafile);
    if (typeof config.datafile === 'string' || config.datafile instanceof String) {
      config.datafile = JSON.parse(config.datafile);
    }

    if (config.skipJSONValidation === true) {
      this.configObj = projectConfig.createProjectConfig(config.datafile);
      this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.SKIPPING_JSON_VALIDATION, MODULE_NAME));
    } else {
      if (config.jsonSchemaValidator.validate(projectConfigSchema, config.datafile)) {
        this.configObj = projectConfig.createProjectConfig(config.datafile);
        this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.VALID_DATAFILE, MODULE_NAME));
      }
    }
  } catch (ex) {
    this.isValidInstance = false;
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
  }

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
  });

  this.notificationCenter = notificationCenter.createNotificationCenter({
    logger: this.logger,
    errorHandler: this.errorHandler,
  });

  this.eventProcessor = new eventProcessor.LogTierV1EventProcessor({
    dispatcher: this.eventDispatcher,
    flushInterval: config.eventFlushInterval || DEFAULT_EVENT_FLUSH_INTERVAL,
    maxQueueSize: config.eventBatchSize || DEFAULT_EVENT_MAX_QUEUE_SIZE,
  });
  this.eventProcessor.start();
}

/**
 * Buckets visitor and sends impression event to Optimizely.
 * @param  {string}      experimentKey
 * @param  {string}      userId
 * @param  {Object}      attributes
 * @return {string|null} variation key
 */
Optimizely.prototype.activate = function(experimentKey, userId, attributes) {
  try {
    if (!this.isValidInstance) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'activate'));
      return null;
    }

    if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
      return this.__notActivatingExperiment(experimentKey, userId);
    }

    try {
      var variationKey = this.getVariation(experimentKey, userId, attributes);
      if (variationKey === null) {
        return this.__notActivatingExperiment(experimentKey, userId);
      }

      // If experiment is not set to 'Running' status, log accordingly and return variation key
      if (!projectConfig.isRunning(this.configObj, experimentKey)) {
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
      var failedActivationLogMessage = sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, MODULE_NAME, userId, experimentKey);
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
  var impressionEvent = eventHelpers.buildImpressionEvent({
    experimentKey: experimentKey,
    variationKey: variationKey,
    userId: userId,
    userAttributes: attributes,
    clientEngine: this.clientEngine,
    clientVersion: this.clientVersion,
    configObj: this.configObj,
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
  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(
    this.configObj,
    experimentKey,
    variationKey
  );
  var experimentId = projectConfig.getExperimentId(this.configObj, experimentKey);
  var impressionEventOptions = {
    attributes: attributes,
    clientEngine: this.clientEngine,
    clientVersion: this.clientVersion,
    configObj: this.configObj,
    experimentId: experimentId,
    userId: userId,
    variationId: variationId,
    logger: this.logger,
  };
  var impressionEvent = eventBuilder.getImpressionEvent(impressionEventOptions);
  var experiment = this.configObj.experimentKeyMap[experimentKey];
  var variation;
  if (experiment && experiment.variationKeyMap) {
    variation = experiment.variationKeyMap[variationKey];
  }
  this.notificationCenter.sendNotifications(
    NOTIFICATION_TYPES.ACTIVATE,
    {
      experiment: experiment,
      userId: userId,
      attributes: attributes,
      variation: variation,
      logEvent: impressionEvent
    }
  );
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
    if (!this.isValidInstance) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'track'));
      return;
    }

    if (!this.__validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
      return;
    }

    if (!projectConfig.eventWithKeyExists(this.configObj, eventKey)) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_EVENT_KEY, MODULE_NAME, eventKey));
    }

    // remove null values from eventTags
    eventTags = this.__filterEmptyValues(eventTags);
    var conversionEvent = eventHelpers.buildConversionEvent({
      eventKey: eventKey,
      eventTags: eventTags,
      userId: userId,
      userAttributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: this.configObj,
    });
    // TODO is it okay to not pass a projectConfig as second argument
    this.eventProcessor.process(conversionEvent);
    this.__emitNotificationCenterTrack(eventKey, userId, attributes, eventTags);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    var failedTrackLogMessage = sprintf(LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId);
    this.logger.log(LOG_LEVEL.INFO, failedTrackLogMessage);
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
    var conversionEventOptions = {
      attributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: this.configObj,
      eventKey: eventKey,
      eventTags: eventTags,
      logger: this.logger,
      userId: userId,
    };
    var conversionEvent = eventBuilder.getConversionEvent(conversionEventOptions);

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
    if (!this.isValidInstance) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getVariation'));
      return null;
    }

    try {
      if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
        return null;
      }

      var experiment = this.configObj.experimentKeyMap[experimentKey];
      if (fns.isEmpty(experiment)) {
        this.logger.log(LOG_LEVEL.DEBUG, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
        return null;
      }

      var variationKey = this.decisionService.getVariation(this.configObj, experimentKey, userId, attributes);
      this.notificationCenter.sendNotifications(
        NOTIFICATION_TYPES.DECISION,
        {
          type: DECISION_INFO_TYPES.EXPERIMENT,
          userId: userId,
          attributes: attributes || {},
          decisionInfo: {
            experimentKey: experimentKey,
            variationKey: variationKey,
          }
        }
      );

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

  try {
    return projectConfig.setForcedVariation(this.configObj, experimentKey, userId, variationKey, this.logger);
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

  try {
    return projectConfig.getForcedVariation(this.configObj, experimentKey, userId, this.logger);
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
      attributesValidator.validate(userAttributes);
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
  var failedActivationLogMessage = sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, MODULE_NAME, userId, experimentKey);
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
    if (!this.isValidInstance) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'isFeatureEnabled'));
      return false;
    }

    if (!this.__validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
      return false;
    }

    var feature = projectConfig.getFeatureFromKey(this.configObj, featureKey, this.logger);
    if (!feature) {
      return false;
    }

    var featureEnabled = false;
    var experimentKey = null;
    var variationKey = null;
    var decision = this.decisionService.getVariationForFeature(this.configObj, feature, userId, attributes);
    var variation = decision.variation;
    
    if (!!variation) {
      featureEnabled = variation.featureEnabled;
      if (decision.decisionSource === DECISION_SOURCES.EXPERIMENT) {
        experimentKey = decision.experiment.key;
        variationKey = decision.variation.key;
        // got a variation from the exp, so we track the impression
        this._sendImpressionEvent(decision.experiment.key, decision.variation.key, userId, attributes);
      }
    }
    
    if (featureEnabled === true) {
      this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FEATURE_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId));
    } else {
      this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId));
      featureEnabled = false;
    }

    this.notificationCenter.sendNotifications(
      enums.NOTIFICATION_TYPES.DECISION,
      {
        type: DECISION_INFO_TYPES.FEATURE,
        userId: userId,
        attributes: attributes || {},
        decisionInfo: {
          featureKey: featureKey,
          featureEnabled: featureEnabled,
          source: decision.decisionSource,
          sourceExperimentKey: experimentKey,
          sourceVariationKey: variationKey,
        }
      }
    );

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
    if (!this.isValidInstance) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getEnabledFeatures'));
      return enabledFeatures;
    }

    if (!this.__validateInputs({ user_id: userId })) {
      return enabledFeatures;
    }

    fns.forOwn(
      this.configObj.featureKeyMap,
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
 * Helper method to get the value for a variable of a certain type attached to a
 * feature flag. Returns null if the feature key is invalid, the variable key is
 * invalid, the given variable type does not match the variable's actual type,
 * or the variable value cannot be cast to the required type.
 *
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} variableType Type of the variable whose value is being
 *                              accessed (must be one of FEATURE_VARIABLE_TYPES
 *                              in lib/utils/enums/index.js)
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {*}                  Value of the variable cast to the appropriate
 *                              type, or null if the feature key is invalid, the
 *                              variable key is invalid, or there is a mismatch
 *                              with the type of the variable
 */
Optimizely.prototype._getFeatureVariableForType = function(featureKey, variableKey, variableType, userId, attributes) {
  if (!this.isValidInstance) {
    var apiName = 'getFeatureVariable' + variableType.charAt(0).toUpperCase() + variableType.slice(1);
    this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, apiName));
    return null;
  }

  if (!this.__validateInputs({ feature_key: featureKey, variable_key: variableKey, user_id: userId }, attributes)) {
    return null;
  }

  var featureFlag = projectConfig.getFeatureFromKey(this.configObj, featureKey, this.logger);
  if (!featureFlag) {
    return null;
  }

  var variable = projectConfig.getVariableForFeature(this.configObj, featureKey, variableKey, this.logger);
  if (!variable) {
    return null;
  }

  if (variable.type !== variableType) {
    this.logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.VARIABLE_REQUESTED_WITH_WRONG_TYPE, MODULE_NAME, variableType, variable.type)
    );
    return null;
  }

  var featureEnabled = false;
  var variableValue = variable.defaultValue;
  var decision = this.decisionService.getVariationForFeature(this.configObj, featureFlag, userId, attributes);
  
  if (decision.variation !== null) {
    featureEnabled = decision.variation.featureEnabled;
    var value = projectConfig.getVariableValueForVariation(this.configObj, variable, decision.variation, this.logger);
    if (value !== null) {
      if (featureEnabled === true) {
        variableValue = value;
        this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.USER_RECEIVED_VARIABLE_VALUE, MODULE_NAME, variableKey, featureFlag.key, variableValue, userId));
      } else {
        this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE, MODULE_NAME,
          featureFlag.key, userId, variableKey));
      }
    } else {
      this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE, MODULE_NAME, variableKey, decision.variation.key));
    }
  } else {
    this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.USER_RECEIVED_DEFAULT_VARIABLE_VALUE, MODULE_NAME, userId,
      variableKey, featureFlag.key));
  }

  var experimentKey = null;
  var variationKey = null;
  if (decision.decisionSource === DECISION_SOURCES.EXPERIMENT) {
    experimentKey = decision.experiment.key;
    variationKey = decision.variation.key;
  }

  var typeCastedValue = projectConfig.getTypeCastValue(variableValue, variableType, this.logger);
  this.notificationCenter.sendNotifications(
    enums.NOTIFICATION_TYPES.DECISION,
    {
      type: DECISION_INFO_TYPES.FEATURE_VARIABLE,
      userId: userId,
      attributes: attributes || {},
      decisionInfo: {
        featureKey: featureKey,
        featureEnabled: featureEnabled,
        variableKey: variableKey,
        variableValue: typeCastedValue,
        variableType: variableType,
        source: decision.decisionSource,
        sourceExperimentKey: experimentKey,
        sourceVariationKey: variationKey
      }
    }
  );
  return typeCastedValue;
};

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
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.STRING, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Cleanup method for killing an running timers and flushing eventQueue
 */
Optimizely.prototype.close = function() {
  try {
    this.eventProcessor.stop();
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
  }
};

module.exports = Optimizely;
