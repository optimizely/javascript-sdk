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
var sprintf = require('sprintf-js').sprintf;
var userProfileServiceValidator = require('../utils/user_profile_service_validator');
var stringValidator = require('../utils/string_value_validator');
var configValidator = require('../utils/config_validator');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'OPTIMIZELY';
var DECISION_SOURCES = enums.DECISION_SOURCES;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;

/** @public
 * @class
 * The Optimizely client class containing an API to programmatically interact with Optimizely.
 * The constructor accepts a configuration object to configure Optimizely.
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/instantiate}.
 *
 * @param {Object} config                     Contains information to configure Optimizely.
 * @param {string} config.clientEngine        Specifies the type of JavaScript used by the client. The value for this field must 
 *                                            be set to "enums.NODE_CLIENT_ENGINE" or "enums.JAVASCRIPT_CLIENT_ENGINE".
 * @param {string} config.clientVersion       Specifies the version of the client's JavaScript engine.
 * @param {Object} config.datafile            The JSON string representing the datafile.
 * @param {Object} config.errorHandler        An error handler object to handle errors.
 * @param {Object} config.eventDispatcher     An event dispatcher to manage network calls.
 * @param {Object} config.logger              A logger implementation to log issues.
 * @param {Object} config.skipJSONValidation  Specifies whether the JSON is validated. Set to `true` to skip JSON validation 
 *                                            on the schema, or `false` to perform validation.
 * @param {Object} config.userProfileService  A User Profile Service.
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
    configObj: this.configObj,
    userProfileService: userProfileService,
    logger: this.logger,
  });

  this.notificationCenter = notificationCenter.createNotificationCenter({
    logger: this.logger,
    errorHandler: this.errorHandler
  });
}

/** 
 * Activates an A/B test for a user, determines whether they qualify for the experiment, buckets a qualified
 * user into a variation, and sends an impression event to Optimizely.
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/activate}.
 *
 * @param  {string}      experimentKey  The key of the variation's experiment to activate.
 * @param  {string}      userId         The user ID.
 * @param  {Object}      attributes     A map of custom key-value string pairs specifying attributes for the user. 
 *
 * @return {string|null} variation key  The key of the variation where the user is bucketed, or `null` if the 
 *                                      user doesn't qualify for the experiment.
 */
Optimizely.prototype.activate = function (experimentKey, userId, attributes) {
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
        var shouldNotDispatchActivateLogMessage = sprintf(LOG_MESSAGES.SHOULD_NOT_DISPATCH_ACTIVATE, MODULE_NAME, experimentKey);
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
 * Creates an impression event and invokes the event dispatcher's `dispatch` method to
 * send this event to Optimizely. The notification center is then used to notify
 * any listeners for the "ACTIVATE" notification.
 *
 * @param {string} experimentKey  The key of the experiment that was activated.
 * @param {string} variationKey   The key of the variation shown in the experiment that was activated.
 * @param {string} userId         The ID of the user to whom the variation was shown.
 * @param {Object} attributes     A map of custom key-value string pairs specifying attributes for the user.
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
 * Tracks a conversion event for a user whose attributes meet the audience conditions for an experiment. 
 * When the user does not meet those conditions, events are not tracked.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user is part of the audience that qualifies for the experiment.
 *
 * This method sends conversion data to Optimizely but doesn't return any values. 
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/track}.
 *
 * @param  {string} eventKey   The key of the event to be tracked. This key must match the event key provided when the event 
 *                             was created in the Optimizely app.
 * @param  {string} userId     The ID of the user associated with the event being tracked.
 * @param  {string} attributes A map of custom key-value string pairs specifying attributes for the user.
 * @param  {Object} eventTags  A map of key-value string pairs specifying event names and their corresponding event values associated with the event.
 */
Optimizely.prototype.track = function(eventKey, userId, attributes, eventTags) {
  try {
    
    if (!this.isValidInstance) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'track'));
      return;
    }

    try {
      if (!this.__validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
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

      // remove null values from eventTags      
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

      var eventDispatcherCallback = function () {
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
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return;
  }
};

/**
 * Buckets a qualified user into an A/B test. Takes the same arguments and returns the same values as `activate`, 
 * but without sending an impression network request. The behavior of the two methods is identical otherwise. 
 * Use `getVariation` if `activate` has been called and the current variation assignment is needed for a given
 * experiment and user.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user
 * is part of the audience that qualifies for the experiment.
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/get-variation}.
 *
 * @param  {string}      experimentKey  The key of the experiment for which to retrieve the variation.
 * @param  {string}      userId         The ID of the user for whom to retrieve the forced variation.
 * @param  {Object}      attributes     A map of custom key-value string pairs specifying attributes for the user. 
 *
 * @return {string|null} variation key  The key of the variation where the user is bucketed, or `null` if the user
 *                                      doesn't qualify for the experiment.
 */
Optimizely.prototype.getVariation = function(experimentKey, userId, attributes) {
  try {
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
        this.logger.log(LOG_LEVEL.DEBUG, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
        return null;
      }

      return this.decisionService.getVariation(experimentKey, userId, attributes);
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
* Forces a user into a variation for a given experiment for the lifetime of the Optimizely client.
* The forced variation value doesn't persist across application launches.
*
* For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/set-forced-variation}.
*
* @param {string} experimentKey     The key of the experiment to set with the forced variation.
* @param {string} userId            The ID of the user to force into the variation.
* @param {string|null} variationKey The key of the forced variation. 
*                                   Set the value to `null` to clear the existing experiment-to-variation mapping.
*
* @return {boolean}                 `true` if the user was successfully forced into a variation, 
*                                   `false` if the `experimentKey` isn't in the project file or the `variationKey` isn't in the experiment.
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
 * Returns the forced variation set by `setForcedVaration` or `null` if no variation was forced.
 * A user can be forced into a variation for a given experiment for the lifetime of the
 * Optimizely client. The forced variation value is runtime only and doesn't persist across application launches.
 *
 * For more information, @see (@link https://docs.developers.optimizely.com/full-stack/docs/get-forced-variation}.
 *
 * @param  {string} experimentKey  The key of the experiment for which to retrieve the forced variation.
 * @param  {string} userId         The ID of the user in the forced variation.
 *
 * @return {string|null}           The variation the user was bucketed into, or `null` if `setForcedVariation` 
 *                                 failed to force the user into the variation.
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
 * Validates the string format of one or more keys or IDs (for example: feature key, user ID).
 *
 * @param  {string}  stringInputs   A map of string keys and associated values.
 * @param  {Object}  userAttributes Optional user attributes to validate.
 * @param  {Object}  eventTags      Optional event tags to validate.
 *
 * @return {boolean}                'true' if all of the inputs are valid, 'false' if any of the inputs are invalid.
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
 * Determines which experiments to track for a given user in an event.
 * Events are only dispatched for experiments with a "Running" status and the specific bucketed user.
 *
 * @param  {string} eventKey    The key of the experiment to retrieve.
 * @param  {string} userId      The ID of the user in the retrieved experiment.
 * @param  {Object} attributes  A map of custom key-value string pairs specifying attributes for the user.
 *
 * @return {Object}             A map of experiment keys to track the variations in which the user has been bucketed.
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
 * Shows a "failed activation" log message and returns null to indicate that the user has not been activated in the specified experiment.
 *
 * @param  experimentKey The key of the experiment that contains the inactive user.
 * @param  userId        The ID of the inactive user.
 *
 * @return {null}
 */
Optimizely.prototype.__notActivatingExperiment = function(experimentKey, userId) {
  var failedActivationLogMessage = sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, MODULE_NAME, userId, experimentKey);
  this.logger.log(LOG_LEVEL.INFO, failedActivationLogMessage);
  return null;
};

/**
 * Dispatches an event. This method then executes the designated callback if the dispatch returns a promise.
 *
 * @param  eventToDispatch The ID of the event to dispatch.
 * @param  callback        A callback to invoke when the event is dispatched.
 */
Optimizely.prototype.__dispatchEvent = function (eventToDispatch, callback) {
  var eventDispatcherResponse = this.eventDispatcher.dispatchEvent(eventToDispatch, callback);
  //checking that response value is a promise, not a request object
  if (!fns.isEmpty(eventDispatcherResponse) && typeof eventDispatcherResponse.then === 'function') {
    eventDispatcherResponse.then(function () {
      callback();
    });
  }
};

/**
 * Filters out attributes and eventTags containing `null` or undefined values.
 *
 * @param  map             A map containing attributes and eventTags to filter.
 *
 * @returns {Object} map   A map containing the filtered attributes and eventTags.
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
 * Determines whether a feature test or rollout is enabled for a given user, and sends
 * an impression event if the user is bucketed into an experiment using the feature.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user
 * is part of the audience that qualifies for the experiment.
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/is-feature-enabled}.
 *
 * @param {string} featureKey   The key of the feature to check.
 * @param {string} userId       The ID of the user to check.
 * @param {Object} attributes   A map of custom key-value string pairs specifying attributes for the user. 
 *
 * @return {boolean}            `true` if the feature is enabled, or `false` if the feature is disabled or couldn't be found.
 */
Optimizely.prototype.isFeatureEnabled = function (featureKey, userId, attributes) {
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
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return false;
  }
};

/**
 * Retrieves a list of features that are enabled for the user.
 * Invoking this method is equivalent to running `isFeatureEnabled` for each feature in the datafile sequentially.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user
 * is part of the audience that qualifies for the experiment.    
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/get-enabled-features}.
 *
 * @param {string} userId      The ID of the user who may have features enabled in one or more experiments.
 * @param {Object} attributes  A map of custom key-value string pairs specifying attributes for the user. 
 *
 * @return {Array}             A list of keys corresponding to the features that are enabled for the user, or an empty list if no
 *                             features could be found for the specified user. 
 */
Optimizely.prototype.getEnabledFeatures = function (userId, attributes) {
  try {
    var enabledFeatures = [];
    if (!this.isValidInstance) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getEnabledFeatures'));
      return enabledFeatures;
    }

    fns.forOwn(this.configObj.featureKeyMap, function (feature) {
      if (this.isFeatureEnabled(feature.key, userId, attributes)) {
        enabledFeatures.push(feature.key);
      }
    }.bind(this));

    return enabledFeatures;
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return [];
  }
};

/**
 * A helper method to get the value for a variable of a certain type associated with a
 * feature flag. Returns `null` if the feature key or variable key is invalid, the given 
 * variable type doesn't match the variable's actual type, or the variable value can't
 * be cast to the required type.
 *
 * @param {string} featureKey   The key of the feature whose variable's value is
 *                              being accessed.
 * @param {string} variableKey  The key of the variable whose value is being
 *                              accessed.
 * @param {string} variableType The type of the variable whose value is being
 *                              accessed. The value must be set to one of the "FEATURE_VARIABLE_TYPES"
 *                              (defined in lib/utils/enums/index.js).
 * @param {string} userId       The ID of the user.
 * @param {Object} attributes   A map of custom key-value string pairs specifying attributes for the user.
 *
 * @return {*}                  The value of the variable cast to the appropriate type, or `null` if the
 *                              feature key or variable key is invalid or there is a mismatch with the variable type.
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
 * Evaluates the specified boolean feature variable and returns its value.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user
 * is part of the audience that qualifies for the experiment.
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/get-feature-variable}.
 *
 * @param {string} featureKey   The key of the feature whose variable's value is being accessed. 
 * @param {string} variableKey  The key of the variable whose value is being accessed.
 * @param {string} userId       The ID of the user participating in the experiment.
 * @param {Object} attributes   A map of custom key-value string pairs specifying attributes for the user. 
 *
 * @return {boolean|null}       The value of the variable, or `null` if the feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type of the variable.
 */
Optimizely.prototype.getFeatureVariableBoolean = function (featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.BOOLEAN, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Evaluates the specified double feature variable and returns its value.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user
 * is part of the audience that qualifies for the experiment.
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/get-feature-variable}.
 *
 * @param {string} featureKey   The key of the feature whose variable's value is being accessed.
 * @param {string} variableKey  The key of the variable whose value is being accessed.
 * @param {string} userId       The ID of the user participating in the experiment.
 * @param {Object} attributes   A map of custom key-value string pairs specifying attributes for the user.
 *
 * @return {number|null}        The value of the variable, or `null` if the feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type of the variable.
 */
Optimizely.prototype.getFeatureVariableDouble = function (featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.DOUBLE, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Evaluates the specified integer feature variable and returns its value.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user
 * is part of the audience that qualifies for the experiment.
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/get-feature-variable}.
 *
 * @param {string} featureKey   The key of the feature whose variable's value is being accessed.
 * @param {string} variableKey  The key of the variable whose value is being accessed.
 * @param {string} userId       The ID of the user participating in the experiment.
 * @param {Object} attributes   A map of custom key-value string pairs specifying attributes for the user. 
 *
 * @return {number|null}        The value of the variable, or `null` if the feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type of the variable.
 */
Optimizely.prototype.getFeatureVariableInteger = function (featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.INTEGER, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Evaluates the specified string feature variable and returns its value.
 *
 * This method takes into account the user `attributes` passed in, to determine if the user
 * is part of the audience that qualifies for the experiment.
 *
 * For more information, @see {@link https://docs.developers.optimizely.com/full-stack/docs/get-feature-variable}.
 *
 * @param {string} featureKey   The key of the feature whose variable's value is being accessed.
 * @param {string} variableKey  The key of the variable whose value is being accessed.
 * @param {string} userId       The ID of the user participating in the experiment. 
 * @param {Object} attributes   A map of custom key-value string pairs specifying attributes for the user.
 *
 * @return {string|null}        The value of the variable, or `null` if the feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type of the variable.
 */
Optimizely.prototype.getFeatureVariableString = function (featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.STRING, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

module.exports = Optimizely;
