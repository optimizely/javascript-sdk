/****************************************************************************
 * Copyright 2016-2018, Optimizely, Inc. and contributors                   *
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
var eventTagsValidator = require('../utils/event_tags_validator');
var notificationCenter = require('../core/notification_center');
var projectConfig = require('../core/project_config');
var projectConfigSchema = require('./project_config_schema');
var sprintf = require('sprintf');
var userProfileServiceValidator = require('../utils/user_profile_service_validator');
var stringValidator = require('../utils/string_value_validator');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'OPTIMIZELY';
var DECISION_SOURCES = enums.DECISION_SOURCES;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;

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

  if (!config.datafile) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, MODULE_NAME));
    this.errorHandler.handleError(new Error(sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, MODULE_NAME)));
    this.isValidInstance = false;
  } else {
    if (typeof config.datafile === 'string' || config.datafile instanceof String) {
      // Attempt to parse the datafile string
      try {
        config.datafile = JSON.parse(config.datafile);
      } catch (ex) {
        this.isValidInstance = false;
        this.logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, MODULE_NAME));
        return;
      }
    }

    if (config.skipJSONValidation === true) {
      this.configObj = projectConfig.createProjectConfig(config.datafile);
      this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.SKIPPING_JSON_VALIDATION, MODULE_NAME));
    } else {
      try {
        if (config.jsonSchemaValidator.validate(projectConfigSchema, config.datafile)) {
          this.configObj = projectConfig.createProjectConfig(config.datafile);
          this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.VALID_DATAFILE, MODULE_NAME));
        }
      } catch (ex) {
        this.isValidInstance = false;
        this.logger.log(LOG_LEVEL.ERROR, ex.message);
        this.errorHandler.handleError(ex);
      }
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
      configObj: this.configObj,
      userProfileService: userProfileService,
      logger: this.logger,
    });

    this.notificationCenter = notificationCenter.createNotificationCenter({
      logger: this.logger,
    });
  }
}

/**
 * Buckets visitor and sends impression event to Optimizely.
 * @param  {string}      experimentKey
 * @param  {string}      userId
 * @param  {Object}      attributes
 * @return {string|null} variation key
 */
Optimizely.prototype.activate = function(experimentKey, userId, attributes) {
  if (!this.isValidInstance) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'activate'));
    return null;
  }

  if (!this.__validateInputs({experiment_key: experimentKey, user_id: userId}, attributes)) {
    return this.__notActivatingExperiment(experimentKey, userId);
  }

  try {
    var variationKey = this.getVariation(experimentKey, userId, attributes);
    if (variationKey === null) {
      return this.__notActivatingExperiment(experimentKey, userId);
    }

    // If experiment is not set to 'Running' status, log accordingly and return variation key
    if (!projectConfig.isRunning(this.configObj, experimentKey)) {
      var shouldNotDispatchActivateLogMessage = sprintf(LOG_MESSAGES.SHOULD_NOT_DISPATCH_ACTIVATE, MODULE_NAME, experimentKey);
      this.logger.log(LOG_LEVEL.DEBUG, shouldNotDispatchActivateLogMessage);
      return variationKey;
    }

    // remove null values from attributes
    attributes = this.__filterEmptyValues(attributes);

    this._sendImpressionEvent(experimentKey, variationKey, userId, attributes);

    return variationKey;
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    var failedActivationLogMessage = sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, MODULE_NAME, userId, experimentKey);
    this.logger.log(LOG_LEVEL.INFO, failedActivationLogMessage);
    this.errorHandler.handleError(ex);
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
  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(this.configObj, experimentKey, variationKey);
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
  var dispatchedImpressionEventLogMessage = sprintf(LOG_MESSAGES.DISPATCH_IMPRESSION_EVENT,
    MODULE_NAME,
    impressionEvent.url,
    JSON.stringify(impressionEvent.params));
  this.logger.log(LOG_LEVEL.DEBUG, dispatchedImpressionEventLogMessage);
  var eventDispatcherCallback = function() {
    var activatedLogMessage = sprintf(LOG_MESSAGES.ACTIVATE_USER, MODULE_NAME, userId, experimentKey);
    this.logger.log(LOG_LEVEL.INFO, activatedLogMessage);
  }.bind(this);
  this.__dispatchEvent(impressionEvent, eventDispatcherCallback);

  var experiment = this.configObj.experimentKeyMap[experimentKey];
  var variation;
  if (experiment && experiment.variationKeyMap) {
    variation = experiment.variationKeyMap[variationKey];
  }
  this.notificationCenter.sendNotifications(
    enums.NOTIFICATION_TYPES.ACTIVATE,
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
  if (!this.isValidInstance) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'track'));
    return;
  }

  try {
    if (!this.__validateInputs({user_id: userId, event_key: eventKey}, attributes, eventTags)) {
      return;
    }

    // determine which experiments and variations we should be tracking for the given event
    var validExperimentsToBucketedVariations = this.__getValidExperimentsForEvent(eventKey, userId, attributes);
    if (!Object.keys(validExperimentsToBucketedVariations).length) {
      // Return and do not send conversion events if the event is not associated with any running experiments
      this.logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.EVENT_NOT_ASSOCIATED_WITH_EXPERIMENTS,
                                               MODULE_NAME,
                                               eventKey));
      return;
    }

    // remove null values from attributes and eventTags
    attributes = this.__filterEmptyValues(attributes);
    eventTags = this.__filterEmptyValues(eventTags);

    var conversionEventOptions = {
      attributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: this.configObj,
      eventKey: eventKey,
      eventTags: eventTags,
      experimentsToVariationMap: validExperimentsToBucketedVariations,
      logger: this.logger,
      userId: userId,
    };
    var conversionEvent = eventBuilder.getConversionEvent(conversionEventOptions);

    var dispatchedConversionEventLogMessage = sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                                      MODULE_NAME,
                                                      conversionEvent.url,
                                                      JSON.stringify(conversionEvent.params));
    this.logger.log(LOG_LEVEL.DEBUG, dispatchedConversionEventLogMessage);

    var eventDispatcherCallback = function() {
      var trackedLogMessage = sprintf(LOG_MESSAGES.TRACK_EVENT, MODULE_NAME, eventKey, userId);
      this.logger.log(LOG_LEVEL.INFO, trackedLogMessage);
    }.bind(this);

    this.__dispatchEvent(conversionEvent, eventDispatcherCallback);

    this.notificationCenter.sendNotifications(
      enums.NOTIFICATION_TYPES.TRACK,
      {
        eventKey: eventKey,
        userId: userId,
        attributes: attributes,
        eventTags: eventTags,
        logEvent: conversionEvent
      }
    );
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    var failedTrackLogMessage = sprintf(LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId);
    this.logger.log(LOG_LEVEL.INFO, failedTrackLogMessage);
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
  if (!this.isValidInstance) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getVariation'));
    return null;
  }

  try {
    if (!this.__validateInputs({experiment_key: experimentKey, user_id: userId}, attributes)) {
      return null;
    }

    var experiment = this.configObj.experimentKeyMap[experimentKey];
    if (fns.isEmpty(experiment)) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
    }

    return this.decisionService.getVariation(experimentKey, userId, attributes);
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
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
  try {
    return projectConfig.getForcedVariation(this.configObj, experimentKey, userId, this.logger);
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
    return null;
  }
};

/**
 * Validates user ID and attributes parameters
 * @param  {string}  stringInputs   Map of string keys and associated values
 * @param  {Object}  userAttributes Optional parameter for user's attributes
 * @param  {Object}  eventTags      Optional parameter for event tags
 * @return {boolean} True if inputs are valid
 *
 */
Optimizely.prototype.__validateInputs = function(stringInputs, userAttributes, eventTags) {
  try {
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
 * Given an event, determine which experiments we should be tracking for the given user.
 * We only dispatch events for experiments that are have the "Running" status and for which
 * the user has been bucketed into.
 * @param  {string} eventKey
 * @param  {string} userId
 * @param  {Object} attributes
 * @return {Object} Map of experiment ids that we want to track to variations ids in which the user has been bucketed
 */
Optimizely.prototype.__getValidExperimentsForEvent = function(eventKey, userId, attributes) {
  var validExperimentsToVariationsMap = {};

  // get all the experiments that are tracking this event
  var experimentIdsForEvent = projectConfig.getExperimentIdsForEvent(this.configObj, eventKey);
  if (!experimentIdsForEvent) {
    return validExperimentsToVariationsMap;
  }

  // determine which variations the user has been bucketed into
  validExperimentsToVariationsMap = fns.reduce(experimentIdsForEvent, function(results, experimentId) {
    var experimentKey = this.configObj.experimentIdMap[experimentId].key;

    // user needs to be bucketed into experiment for us to track the event
    var variationKey = this.getVariation(experimentKey, userId, attributes);
    if (variationKey) {
      // if experiment is active but not running, it is in LAUNCHED state, so we don't track a conversion for it
      if (!projectConfig.isRunning(this.configObj, experimentKey)) {
        var shouldNotDispatchTrackLogMessage = sprintf(LOG_MESSAGES.SHOULD_NOT_DISPATCH_TRACK, MODULE_NAME, experimentKey);
        this.logger.log(LOG_LEVEL.DEBUG, shouldNotDispatchTrackLogMessage);
      } else {
        // if running + user is bucketed then add to result
        var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(this.configObj, experimentKey, variationKey);
        results[experimentId] = variationId;
      }
    } else {
      var notTrackingUserForExperimentLogMessage = sprintf(LOG_MESSAGES.NOT_TRACKING_USER_FOR_EXPERIMENT,
                                                           MODULE_NAME,
                                                           userId,
                                                           experimentKey);
      this.logger.log(LOG_LEVEL.DEBUG, notTrackingUserForExperimentLogMessage);
    }
    return results;
  }.bind(this), {});

  return validExperimentsToVariationsMap;
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
 * Dispatches an event and executes the designated callback if the dispatch returns a promise
 * @param  eventToDispatch
 * @param  callback
 */
Optimizely.prototype.__dispatchEvent = function (eventToDispatch, callback) {
    var eventDispatcherResponse = this.eventDispatcher.dispatchEvent(eventToDispatch, callback);
    //checking that response value is a promise, not a request object
    if (!fns.isEmpty(eventDispatcherResponse) && typeof eventDispatcherResponse.then === 'function') {
      eventDispatcherResponse.then(function() {
        callback();
      });
    }
};

/**
 * Filters out attributes/eventTags with null or undefined values
 * @param  map
 * @returns {Object} map
 */
Optimizely.prototype.__filterEmptyValues = function (map) {
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
  if (!this.isValidInstance) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'isFeatureEnabled'));
    return false;
  }

  if (!this.__validateInputs({feature_key: featureKey, user_id: userId}, attributes)) {
    return false;
  }

  var feature = projectConfig.getFeatureFromKey(this.configObj, featureKey, this.logger);
  if (!feature) {
    return false;
  }

  var decision = this.decisionService.getVariationForFeature(feature, userId, attributes);
  var variation = decision.variation;
  if (!!variation) {
    if (decision.decisionSource === DECISION_SOURCES.EXPERIMENT) {
      // got a variation from the exp, so we track the impression
      this._sendImpressionEvent(decision.experiment.key, decision.variation.key, userId, attributes);
    }
    if (variation.featureEnabled === true) {
      this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FEATURE_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId));
      return true;
    }
  }
  this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId));
  return false;
};

/**
 * Returns an Array containing the keys of all features in the project that are
 * enabled for the given user.
 * @param {string} userId
 * @param {Object} attributes
 * @return {Array} Array of feature keys (strings)
 */
Optimizely.prototype.getEnabledFeatures = function(userId, attributes) {
  var enabledFeatures = [];
  if (!this.isValidInstance) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getEnabledFeatures'));
    return enabledFeatures;
  }

  fns.forOwn(this.configObj.featureKeyMap, function(feature) {
    if (this.isFeatureEnabled(feature.key, userId, attributes)) {
      enabledFeatures.push(feature.key);
    }
  }.bind(this));

  return enabledFeatures;
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

  if (!this.__validateInputs({feature_key: featureKey, variable_key: variableKey, user_id: userId}, attributes)) {
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
    this.logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.VARIABLE_REQUESTED_WITH_WRONG_TYPE, MODULE_NAME, variableType, variable.type));
    return null;
  }

  var decision = this.decisionService.getVariationForFeature(featureFlag, userId, attributes);
  var variableValue;
  if (decision.variation !== null) {
    variableValue = projectConfig.getVariableValueForVariation(this.configObj, variable, decision.variation, this.logger);
    this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.USER_RECEIVED_VARIABLE_VALUE, MODULE_NAME, variableKey, featureFlag.key, variableValue, userId));
  } else {
    variableValue = variable.defaultValue;
    this.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.USER_RECEIVED_DEFAULT_VARIABLE_VALUE, MODULE_NAME, userId, variableKey, featureFlag.key));
  }

  return projectConfig.getTypeCastValue(variableValue, variableType, this.logger);
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
  return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.BOOLEAN, userId, attributes);
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
  return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.DOUBLE, userId, attributes);
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
  return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.INTEGER, userId, attributes);
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
  return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.STRING, userId, attributes);
};

module.exports = Optimizely;
